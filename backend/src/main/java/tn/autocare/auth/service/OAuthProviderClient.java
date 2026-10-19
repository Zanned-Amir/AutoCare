package tn.autocare.auth.service;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

import tn.autocare.auth.entity.OAuthProfileData;
import tn.autocare.auth.entity.OAuthProvider;
import tn.autocare.auth.config.OAuthProperties;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Authorization-code flow for Google, Facebook and GitHub (template: auth-google,
 * auth-facebook, auth-github strategies), with plain HTTP calls: build the authorize URL,
 * exchange the code, read the profile.
 */
@Component
public class OAuthProviderClient {

	private static final ParameterizedTypeReference<Map<String, Object>> JSON = new ParameterizedTypeReference<>() {
	};

	private final RestClient http;

	private final OAuthProperties config;

	public OAuthProviderClient(RestClient.Builder builder, OAuthProperties properties) {
		this.http = builder.build();
		this.config = properties;
	}

	public URI authorizationUri(OAuthProvider provider, String state, String redirectUri) {
		return switch (provider) {
			case GOOGLE -> UriComponentsBuilder.fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
				.queryParam("client_id", config.google().clientId())
				.queryParam("redirect_uri", redirectUri)
				.queryParam("response_type", "code")
				.queryParam("scope", "openid email profile")
				.queryParam("prompt", "select_account")
				.queryParam("state", state)
				.encode()
				.build()
				.toUri();
			case FACEBOOK -> UriComponentsBuilder.fromUriString("https://www.facebook.com/v21.0/dialog/oauth")
				.queryParam("client_id", config.facebook().clientId())
				.queryParam("redirect_uri", redirectUri)
				.queryParam("scope", "email,public_profile")
				.queryParam("state", state)
				.encode()
				.build()
				.toUri();
			case GITHUB -> UriComponentsBuilder.fromUriString("https://github.com/login/oauth/authorize")
				.queryParam("client_id", config.github().clientId())
				.queryParam("redirect_uri", redirectUri)
				.queryParam("scope", "read:user user:email")
				.queryParam("state", state)
				.encode()
				.build()
				.toUri();
			case APPLE -> throw new AppException(ErrorCode.OAUTH_PROVIDER_DISABLED, "Apple uses ID tokens");
		};
	}

	public OAuthProfileData exchangeCode(OAuthProvider provider, String code, String redirectUri) {
		try {
			return switch (provider) {
				case GOOGLE -> google(code, redirectUri);
				case FACEBOOK -> facebook(code, redirectUri);
				case GITHUB -> github(code, redirectUri);
				case APPLE -> throw new AppException(ErrorCode.OAUTH_PROVIDER_DISABLED, "Apple uses ID tokens");
			};
		}
		catch (RestClientException ex) {
			throw new AppException(ErrorCode.OAUTH_FAILED, "Provider call failed: " + ex.getMessage());
		}
	}

	private OAuthProfileData google(String code, String redirectUri) {
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("code", code);
		form.add("client_id", config.google().clientId());
		form.add("client_secret", config.google().clientSecret());
		form.add("redirect_uri", redirectUri);
		form.add("grant_type", "authorization_code");
		Map<String, Object> token = http.post()
			.uri("https://oauth2.googleapis.com/token")
			.contentType(MediaType.APPLICATION_FORM_URLENCODED)
			.body(form)
			.retrieve()
			.body(JSON);
		Map<String, Object> user = http.get()
			.uri("https://openidconnect.googleapis.com/v1/userinfo")
			.headers(h -> h.setBearerAuth(String.valueOf(token.get("access_token"))))
			.retrieve()
			.body(JSON);
		return new OAuthProfileData(OAuthProvider.GOOGLE, String.valueOf(user.get("sub")), (String) user.get("email"),
				Boolean.TRUE.equals(user.get("email_verified")), (String) user.get("name"),
				(String) user.get("picture"));
	}

	private OAuthProfileData facebook(String code, String redirectUri) {
		Map<String, Object> token = http.get()
			.uri("https://graph.facebook.com/v21.0/oauth/access_token?client_id={id}&redirect_uri={uri}&client_secret={secret}&code={code}",
					config.facebook().clientId(), redirectUri, config.facebook().clientSecret(), code)
			.retrieve()
			.body(JSON);
		Map<String, Object> user = http.get()
			.uri("https://graph.facebook.com/me?fields=id,name,email&access_token={token}", token.get("access_token"))
			.retrieve()
			.body(JSON);
		// Facebook only returns e-mails the user has confirmed.
		return new OAuthProfileData(OAuthProvider.FACEBOOK, String.valueOf(user.get("id")), (String) user.get("email"),
				user.get("email") != null, (String) user.get("name"), null);
	}

	private OAuthProfileData github(String code, String redirectUri) {
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("code", code);
		form.add("client_id", config.github().clientId());
		form.add("client_secret", config.github().clientSecret());
		form.add("redirect_uri", redirectUri);
		Map<String, Object> token = http.post()
			.uri("https://github.com/login/oauth/access_token")
			.accept(MediaType.APPLICATION_JSON)
			.contentType(MediaType.APPLICATION_FORM_URLENCODED)
			.body(form)
			.retrieve()
			.body(JSON);
		String accessToken = String.valueOf(token.get("access_token"));
		Map<String, Object> user = http.get()
			.uri("https://api.github.com/user")
			.headers(h -> h.setBearerAuth(accessToken))
			.retrieve()
			.body(JSON);
		// The profile e-mail can be hidden; the primary verified one comes from
		// /user/emails.
		List<Map<String, Object>> emails = http.get()
			.uri("https://api.github.com/user/emails")
			.headers(h -> h.setBearerAuth(accessToken))
			.retrieve()
			.body(new ParameterizedTypeReference<>() {
			});
		Map<String, Object> primary = emails == null ? null
				: emails.stream()
					.filter(e -> Boolean.TRUE.equals(e.get("primary")) && Boolean.TRUE.equals(e.get("verified")))
					.findFirst()
					.orElse(null);
		String name = user.get("name") != null ? (String) user.get("name") : (String) user.get("login");
		return new OAuthProfileData(OAuthProvider.GITHUB, String.valueOf(user.get("id")),
				primary == null ? null : (String) primary.get("email"), primary != null, name,
				(String) user.get("avatar_url"));
	}

}
