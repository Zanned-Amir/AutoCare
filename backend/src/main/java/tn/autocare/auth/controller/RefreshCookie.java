package tn.autocare.auth.controller;

import java.time.Duration;

import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.entity.SessionScope;
import tn.autocare.shared.security.HttpSecurityProperties;

/**
 * The httpOnly cookie carrying the refresh token (cookie mode), only sent to /api/auth.
 * Customer and backoffice sessions use different cookies so one browser can hold both.
 */
@Component
@RequiredArgsConstructor
class RefreshCookie {

	static final String CUSTOMER = "autocare_refresh";

	static final String BACKOFFICE = "autocare_bo_refresh";

	private final HttpSecurityProperties httpSecurity;

	static String nameFor(SessionScope scope) {
		return scope == SessionScope.BACKOFFICE ? BACKOFFICE : CUSTOMER;
	}

	ResponseCookie create(SessionScope scope, String value, Duration maxAge, HttpServletRequest request) {
		return ResponseCookie.from(nameFor(scope), value)
			.httpOnly(true)
			.secure(httpSecurity.cookieSecure())
			.sameSite("Strict")
			.path(request.getContextPath() + "/auth")
			.maxAge(maxAge)
			.build();
	}

	ResponseCookie clear(SessionScope scope, HttpServletRequest request) {
		return create(scope, "", Duration.ZERO, request);
	}

}
