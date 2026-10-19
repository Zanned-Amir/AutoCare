package tn.autocare.auth.dto;

import java.time.Instant;

public record OAuthAccountResponse(String provider, String email, String name, Instant linkedAt, Instant lastUsedAt) {
}
