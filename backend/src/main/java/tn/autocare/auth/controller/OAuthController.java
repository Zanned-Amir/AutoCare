package tn.autocare.auth.controller;

import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.AuthResponse;
import tn.autocare.auth.dto.AuthTokensResponse;
import tn.autocare.auth.dto.IdTokenLoginRequest;
import tn.autocare.auth.dto.OAuthAccountResponse;
import tn.autocare.auth.dto.OAuthLinkResponse;
import tn.autocare.auth.dto.OAuthProviderResponse;
import tn.autocare.auth.service.AuthSession;
import tn.autocare.auth.service.OAuthService;
import tn.autocare.shared.config.WebAppProperties;
import tn.autocare.shared.security.CurrentUser;

/**
 * OAuth sign-in (template: identity/oauth). Web: the browser goes to /authorize, the
 * provider sends it back to /callback, which sets the refresh cookie and redirects to the
 * web app's /oauth/callback page. Mobile/JS SDKs: post the provider's ID token to
 * /auth/c|h/oauth/{provider}/id-token.
 */
@Tag(name = "OAuth")
@RestController
@RequiredArgsConstructor
public class OAuthController {

	private final OAuthService oauthService;

	private final RefreshCookie refreshCookie;

	private final WebAppProperties webApp;

	@GetMapping("/auth/oauth/providers")
	public List<OAuthProviderResponse> listOAuthProviders() {
		return oauthService.listEnabledProviders();
	}

	@GetMapping("/auth/oauth/{provider}/authorize")
	public ResponseEntity<Void> authorizeOAuth(@PathVariable String provider,
			@RequestParam(required = false) String redirect) {
		return ResponseEntity.status(HttpStatus.FOUND).location(oauthService.startLogin(provider, redirect)).build();
	}

	@GetMapping("/auth/oauth/{provider}/callback")
	public ResponseEntity<Void> handleOAuthCallback(@PathVariable String provider,
			@RequestParam(required = false) String code, @RequestParam(required = false) String state,
			@RequestParam(required = false) String error, HttpServletRequest http) {
		OAuthService.CallbackResult result = oauthService.handleCallback(provider, code, state, error,
				ClientInfoResolver.of(http), LocaleContextHolder.getLocale());
		String web = webApp.baseUrl();
		if (result.error() != null) {
			URI target = UriComponentsBuilder.fromUriString(web + (result.linked() ? "/account" : "/oauth/callback"))
				.queryParam("error", result.error().name())
				.build()
				.toUri();
			return ResponseEntity.status(HttpStatus.FOUND).location(target).build();
		}
		if (result.linked()) {
			URI target = UriComponentsBuilder.fromUriString(web + "/account")
				.queryParam("linked", provider)
				.build()
				.toUri();
			return ResponseEntity.status(HttpStatus.FOUND).location(target).build();
		}
		AuthSession session = result.session();
		URI target = UriComponentsBuilder.fromUriString(web + "/oauth/callback")
			.queryParam("redirect", result.redirectPath())
			.encode()
			.build()
			.toUri();
		return ResponseEntity.status(HttpStatus.FOUND)
			.location(target)
			.header(HttpHeaders.SET_COOKIE, cookieFor(session, http))
			.build();
	}

	@PostMapping("/auth/c/oauth/{provider}/id-token")
	public ResponseEntity<AuthResponse> loginWithIdTokenCookie(@PathVariable String provider,
			@Valid @RequestBody IdTokenLoginRequest request, HttpServletRequest http) {
		AuthSession session = oauthService.loginWithIdToken(provider, request.idToken(), ClientInfoResolver.of(http),
				LocaleContextHolder.getLocale());
		return ResponseEntity.ok().header(HttpHeaders.SET_COOKIE, cookieFor(session, http)).body(session.response());
	}

	@PostMapping("/auth/h/oauth/{provider}/id-token")
	public AuthTokensResponse loginWithIdTokenHeader(@PathVariable String provider,
			@Valid @RequestBody IdTokenLoginRequest request, HttpServletRequest http) {
		return oauthService
			.loginWithIdToken(provider, request.idToken(), ClientInfoResolver.of(http), LocaleContextHolder.getLocale())
			.toTokensResponse();
	}

	@GetMapping("/me/oauth")
	public List<OAuthAccountResponse> listLinkedOAuthAccounts() {
		return oauthService.listLinkedAccounts(CurrentUser.id());
	}

	@PostMapping("/me/oauth/{provider}/link")
	public OAuthLinkResponse linkOAuthAccount(@PathVariable String provider) {
		return new OAuthLinkResponse(oauthService.startLink(CurrentUser.id(), provider).toString());
	}

	@DeleteMapping("/me/oauth/{provider}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void unlinkOAuthAccount(@PathVariable String provider) {
		oauthService.unlinkAccount(CurrentUser.id(), provider);
	}

	private String cookieFor(AuthSession session, HttpServletRequest http) {
		Duration maxAge = Duration.between(Instant.now(), session.refreshTokenExpiresAt());
		return refreshCookie.create(session.scope(), session.refreshToken(), maxAge, http).toString();
	}

}
