package tn.autocare.telegram.dto;

import java.time.Instant;

public record TelegramStatusResponse(boolean enabled, boolean linked, String username, Instant linkedAt) {
}
