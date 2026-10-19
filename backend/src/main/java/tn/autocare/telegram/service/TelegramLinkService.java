package tn.autocare.telegram.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.Locale;

import org.springframework.context.MessageSource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.telegram.config.TelegramProperties;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.i18n.SupportedLocales;
import tn.autocare.telegram.dto.TelegramLinkResponse;
import tn.autocare.telegram.dto.TelegramStatusResponse;
import tn.autocare.telegram.dto.TelegramUpdate;
import tn.autocare.telegram.entity.TelegramLink;
import tn.autocare.telegram.repository.TelegramLinkRepository;

/**
 * Linking: the app asks for a one-time code, the user opens t.me/bot?start=code, Telegram
 * sends us "/start code" from their chat, and we store the chat id for that user.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TelegramLinkService {

	static final Duration CODE_VALIDITY = Duration.ofMinutes(10);

	private static final SecureRandom RANDOM = new SecureRandom();

	private static final String CODE_KEY = "autocare:telegram:link:";

	private final TelegramLinkRepository linkRepository;

	private final TelegramClient telegramClient;

	private final StringRedisTemplate redis;

	private final MessageSource messageSource;

	private final TelegramProperties telegram;

	public TelegramLinkResponse createLinkCode(Long userId) {
		checkEnabled();
		byte[] bytes = new byte[18];
		RANDOM.nextBytes(bytes);
		String code = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		redis.opsForValue().set(CODE_KEY + code, String.valueOf(userId), CODE_VALIDITY);
		return new TelegramLinkResponse("https://t.me/" + telegram.botUsername() + "?start=" + code,
				CODE_VALIDITY.toSeconds());
	}

	@Transactional(readOnly = true)
	public TelegramStatusResponse getTelegramStatus(Long userId) {
		return linkRepository.findByUserId(userId)
			.map(link -> new TelegramStatusResponse(telegram.enabled(), true, link.getUsername(), link.getLinkedAt()))
			.orElseGet(() -> new TelegramStatusResponse(telegram.enabled(), false, null, null));
	}

	@Transactional
	public void unlinkTelegram(Long userId) {
		linkRepository.deleteByUserId(userId);
	}

	/**
	 * Handles one update from polling or the webhook. Only "/start <code>" does
	 * something.
	 */
	@Transactional
	public void handleUpdate(TelegramUpdate update) {
		TelegramUpdate.Message message = update.message();
		if (message == null || message.text() == null || message.chat() == null) {
			return;
		}
		String chatId = String.valueOf(message.chat().id());
		Locale locale = SupportedLocales.fromTag(message.from() == null ? null : message.from().languageCode());
		String text = message.text().trim();
		if (!text.startsWith("/start")) {
			reply(chatId, "telegram.help", locale);
			return;
		}
		String code = text.substring("/start".length()).trim();
		String userId = code.isEmpty() ? null : redis.opsForValue().getAndDelete(CODE_KEY + code);
		if (userId == null) {
			reply(chatId, code.isEmpty() ? "telegram.help" : "telegram.link-invalid", locale);
			return;
		}
		String username = message.from() == null ? null : message.from().username();
		// A chat belongs to one account: linking it elsewhere moves it.
		linkRepository.findByChatId(chatId)
			.filter(existing -> !existing.getUserId().equals(Long.valueOf(userId)))
			.ifPresent(linkRepository::delete);
		linkRepository.flush();
		linkRepository.findByUserId(Long.valueOf(userId))
			.ifPresentOrElse(link -> link.relink(chatId, username),
					() -> linkRepository.save(TelegramLink.link(Long.valueOf(userId), chatId, username)));
		reply(chatId, "telegram.link-success", locale);
	}

	private void reply(String chatId, String key, Locale locale) {
		try {
			telegramClient.sendMessage(chatId, messageSource.getMessage(key, null, locale));
		}
		catch (RuntimeException ex) {
			log.warn("Telegram reply to {} failed: {}", chatId, ex.getMessage());
		}
	}

	private void checkEnabled() {
		if (!telegram.enabled()) {
			throw new AppException(ErrorCode.TELEGRAM_DISABLED, "Telegram is not configured");
		}
	}

}
