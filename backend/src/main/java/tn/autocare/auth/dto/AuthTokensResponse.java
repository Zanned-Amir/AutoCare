package tn.autocare.auth.dto;

import java.time.Instant;

/**
 * Header mode (/auth/h/*, mobile apps): both tokens in the body; store the refresh token
 * securely.
 */
public record AuthTokensResponse(String accessToken, Instant accessTokenExpiresAt, String refreshToken,
		Instant refreshTokenExpiresAt, String scope, MeResponse user) {
}
