package tn.autocare.telegram.controller;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import tn.autocare.telegram.config.TelegramProperties;
import tn.autocare.telegram.dto.TelegramUpdate;
import tn.autocare.telegram.service.TelegramLinkService;

/**
 * Production transport. Register it once with setWebhook(url, secret_token); Telegram
 * then sends the secret in X-Telegram-Bot-Api-Secret-Token on every call.
 */
@Hidden
@RestController
@RequiredArgsConstructor
public class TelegramWebhookController {

	private final TelegramLinkService linkService;

	private final TelegramProperties telegram;

	@PostMapping("/integrations/telegram/webhook")
	public ResponseEntity<Void> receiveTelegramUpdate(
			@RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secret,
			@RequestBody TelegramUpdate update) {
		String expected = telegram.webhookSecret();
		if (!telegram.enabled() || expected == null || expected.isBlank() || secret == null || !MessageDigest
			.isEqual(expected.getBytes(StandardCharsets.UTF_8), secret.getBytes(StandardCharsets.UTF_8))) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		linkService.handleUpdate(update);
		return ResponseEntity.ok().build();
	}

}
