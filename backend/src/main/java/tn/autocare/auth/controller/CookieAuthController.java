package tn.autocare.auth.controller;

import java.time.Duration;
import java.time.Instant;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.AuthResponse;
import tn.autocare.auth.dto.LoginRequest;
import tn.autocare.auth.dto.RegisterRequest;
import tn.autocare.auth.entity.SessionScope;
import tn.autocare.auth.service.AuthService;
import tn.autocare.auth.service.AuthSession;

/**
 * Cookie mode, for the web app (template: /auth/c/*). The access token is in the body,
 * the refresh token only in an httpOnly cookie. {@code ?scope=backoffice} picks the staff
 * session's cookie.
 */
@Tag(name = "Auth - cookie (web)")
@RestController
@RequestMapping("/auth/c")
@RequiredArgsConstructor
public class CookieAuthController {

	private final AuthService authService;

	private final RefreshCookie refreshCookie;

	@PostMapping("/register")
	public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest request,
			HttpServletRequest http) {
		return withCookie(HttpStatus.CREATED, authService.registerUser(request, ClientInfoResolver.of(http)), http);
	}

	@PostMapping("/login")
	public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		return withCookie(HttpStatus.OK, authService.loginUser(request, ClientInfoResolver.of(http)), http);
	}

	@PostMapping("/refresh")
	public ResponseEntity<AuthResponse> refreshSession(@RequestParam(defaultValue = "customer") String scope,
			@CookieValue(value = RefreshCookie.CUSTOMER, required = false) String customerToken,
			@CookieValue(value = RefreshCookie.BACKOFFICE, required = false) String backofficeToken,
			HttpServletRequest http) {
		String token = isBackoffice(scope) ? backofficeToken : customerToken;
		// No cookie = a visitor who never signed in: not an error, so the browser logs
		// nothing.
		if (token == null || token.isBlank()) {
			return ResponseEntity.noContent().build();
		}
		return withCookie(HttpStatus.OK, authService.refreshSession(token, ClientInfoResolver.of(http)), http);
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logoutUser(@RequestParam(defaultValue = "customer") String scope,
			@CookieValue(value = RefreshCookie.CUSTOMER, required = false) String customerToken,
			@CookieValue(value = RefreshCookie.BACKOFFICE, required = false) String backofficeToken,
			HttpServletRequest http) {
		SessionScope sessionScope = isBackoffice(scope) ? SessionScope.BACKOFFICE : SessionScope.CUSTOMER;
		authService.logoutUser(sessionScope == SessionScope.BACKOFFICE ? backofficeToken : customerToken);
		return ResponseEntity.noContent()
			.header(HttpHeaders.SET_COOKIE, refreshCookie.clear(sessionScope, http).toString())
			.build();
	}

	private ResponseEntity<AuthResponse> withCookie(HttpStatus status, AuthSession session, HttpServletRequest http) {
		Duration maxAge = Duration.between(Instant.now(), session.refreshTokenExpiresAt());
		return ResponseEntity.status(status)
			.header(HttpHeaders.SET_COOKIE,
					refreshCookie.create(session.scope(), session.refreshToken(), maxAge, http).toString())
			.body(session.response());
	}

	private static boolean isBackoffice(String scope) {
		return "backoffice".equalsIgnoreCase(scope);
	}

}
