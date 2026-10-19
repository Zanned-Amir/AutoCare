package tn.autocare.telegram.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Telegram bot. An empty {@code botToken} turns the module off. */
@ConfigurationProperties(prefix = "autocare.telegram")
public record TelegramProperties(String botToken, String botUsername, String mode, String webhookSecret) {

	public boolean enabled() {
		return botToken != null && !botToken.isBlank();
	}

}
