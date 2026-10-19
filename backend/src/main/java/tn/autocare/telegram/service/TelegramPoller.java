package tn.autocare.telegram.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.telegram.dto.TelegramUpdate;

/**
 * Dev transport: asks Telegram for new updates. Use the webhook in production (polling
 * from several instances makes Telegram answer 409).
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("'${autocare.telegram.bot-token:}' != '' and '${autocare.telegram.mode:polling}' == 'polling'")
class TelegramPoller {

	private final TelegramClient telegramClient;

	private final TelegramLinkService linkService;

	private long offset;

	@Scheduled(fixedDelay = 1000)
	void pollTelegramUpdates() {
		try {
			for (TelegramUpdate update : telegramClient.getUpdates(offset, 25)) {
				offset = update.updateId() + 1;
				linkService.handleUpdate(update);
			}
		}
		catch (RuntimeException ex) {
			log.warn("Telegram polling failed: {}", ex.getMessage());
		}
	}

}
