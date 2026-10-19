package tn.autocare.shared.security;

import java.util.Optional;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

public final class CurrentUser {

	private CurrentUser() {
	}

	public static Optional<Long> findId() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth instanceof JwtAuthenticationToken jwt) {
			return Optional.of(Long.valueOf(jwt.getToken().getSubject()));
		}
		return Optional.empty();
	}

	/**
	 * The session (refresh token) id carried in the access token's "sid" claim, if any.
	 */
	public static Optional<Long> findSessionId() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth instanceof JwtAuthenticationToken jwt && jwt.getToken().hasClaim(SESSION_CLAIM)) {
			return Optional.of(((Number) jwt.getToken().getClaim(SESSION_CLAIM)).longValue());
		}
		return Optional.empty();
	}

	public static final String SESSION_CLAIM = "sid";

	public static Long id() {
		return findId().orElseThrow(() -> new AppException(ErrorCode.UNAUTHENTICATED, "Authentication required"));
	}

}
