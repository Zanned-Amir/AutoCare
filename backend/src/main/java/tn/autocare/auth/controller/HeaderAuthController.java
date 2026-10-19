package tn.autocare.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.AuthTokensResponse;
import tn.autocare.auth.dto.LoginRequest;
import tn.autocare.auth.dto.RefreshTokenRequest;
import tn.autocare.auth.dto.RegisterRequest;
import tn.autocare.auth.service.AuthService;

/**
 * Header mode, for mobile apps (template: /auth/h/*). Both tokens come back in the body;
 * the app keeps the refresh token in secure storage (expo-secure-store) and sends it back
 * in the body to refresh.
 */
@Tag(name = "Auth - header (mobile)")
@RestController
@RequestMapping("/auth/h")
@RequiredArgsConstructor
public class HeaderAuthController {

	private final AuthService authService;

	@PostMapping("/register")
	@ResponseStatus(HttpStatus.CREATED)
	public AuthTokensResponse registerUser(@Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
		return authService.registerUser(request, ClientInfoResolver.of(http)).toTokensResponse();
	}

	@PostMapping("/login")
	public AuthTokensResponse loginUser(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
		return authService.loginUser(request, ClientInfoResolver.of(http)).toTokensResponse();
	}

	@PostMapping("/refresh")
	public AuthTokensResponse refreshSession(@Valid @RequestBody RefreshTokenRequest request, HttpServletRequest http) {
		return authService.refreshSession(request.refreshToken(), ClientInfoResolver.of(http)).toTokensResponse();
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void logoutUser(@Valid @RequestBody RefreshTokenRequest request) {
		authService.logoutUser(request.refreshToken());
	}

}
