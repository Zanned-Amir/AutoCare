package tn.autocare.auth.service;

import java.time.Instant;

import tn.autocare.auth.dto.AuthResponse;
import tn.autocare.auth.dto.AuthTokensResponse;
import tn.autocare.auth.entity.SessionScope;

/** Result of login/register/refresh: the response body plus the raw refresh token. */
public record AuthSession(AuthResponse response, String refreshToken, Instant refreshTokenExpiresAt, Long sessionId,
		SessionScope scope) {

	public AuthTokensResponse toTokensResponse() {
		return new AuthTokensResponse(response.accessToken(), response.accessTokenExpiresAt(), refreshToken,
				refreshTokenExpiresAt, scope.claim(), response.user());
	}

}
