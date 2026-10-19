package tn.autocare.telegram.dto;

/** Open {@code url} in Telegram and press Start within {@code expiresInSeconds}. */
public record TelegramLinkResponse(String url, long expiresInSeconds) {
}
