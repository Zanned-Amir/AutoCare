package tn.autocare.auth.dto;

import java.time.Instant;

/**
 * Body of login, register and refresh. The refresh token travels only in an httpOnly
 * cookie.
 */
public record AuthResponse(String accessToken, Instant accessTokenExpiresAt, MeResponse user) {
}
