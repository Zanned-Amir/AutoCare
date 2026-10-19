package tn.autocare.telegram.service;

import java.util.Optional;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.telegram.config.TelegramProperties;
import tn.autocare.shared.tx.AfterCommit;
import tn.autocare.telegram.api.TelegramFacade;
import tn.autocare.telegram.entity.TelegramLink;
import tn.autocare.telegram.repository.TelegramLinkRepository;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class TelegramFacadeImpl implements TelegramFacade {

	private final TelegramLinkRepository linkRepository;

	private final AsyncTelegramSender asyncSender;

	private final TelegramProperties telegram;

	@Override
	public boolean isEnabled() {
		return telegram.enabled();
	}

	@Override
	public boolean isLinked(Long userId) {
		return isEnabled() && linkRepository.findByUserId(userId).isPresent();
	}

	@Override
	public boolean sendMessage(Long userId, String text) {
		Optional<TelegramLink> link = isEnabled() ? linkRepository.findByUserId(userId) : Optional.empty();
		link.ifPresent(found -> AfterCommit.run(() -> asyncSender.send(found.getChatId(), text)));
		return link.isPresent();
	}

	@Service
	@RequiredArgsConstructor
	static class AsyncTelegramSender {

		private final TelegramClient telegramClient;

		@Async
		public void send(String chatId, String text) {
			try {
				telegramClient.sendMessage(chatId, text);
			}
			catch (RuntimeException ex) {
				log.error("Could not send Telegram message to chat {}", chatId, ex);
			}
		}

	}

}
