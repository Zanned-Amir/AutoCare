package tn.autocare.auth.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

import tn.autocare.auth.entity.OAuthProfileData;
import tn.autocare.auth.entity.OAuthProvider;
import tn.autocare.auth.config.OAuthProperties;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Verifies Google and Apple ID tokens (template: oauth/mobile): signature against the
 * provider's public keys, issuer, expiry, and audience = one of our client ids.
 */
@Component
public class IdTokenVerifier {

	private final OAuthProperties config;

	private final Map<OAuthProvider, JwtDecoder> decoders = new ConcurrentHashMap<>();

	public IdTokenVerifier(OAuthProperties properties) {
		this.config = properties;
	}

	public OAuthProfileData verifyIdToken(OAuthProvider provider, String idToken) {
		Jwt jwt;
		try {
			jwt = decoders.computeIfAbsent(provider, this::createDecoder).decode(idToken);
		}
		catch (JwtException ex) {
			throw new AppException(ErrorCode.INVALID_ID_TOKEN, "Invalid ID token: " + ex.getMessage());
		}
		Object verified = jwt.getClaim("email_verified");
		boolean emailVerified = Boolean.TRUE.equals(verified) || "true".equals(verified);
		return new OAuthProfileData(provider, jwt.getSubject(), jwt.getClaimAsString("email"), emailVerified,
				jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
	}

	private JwtDecoder createDecoder(OAuthProvider provider) {
		String jwks;
		String issuer;
		List<String> audiences = new ArrayList<>();
		switch (provider) {
			case GOOGLE -> {
				jwks = "https://www.googleapis.com/oauth2/v3/certs";
				issuer = "https://accounts.google.com";
				audiences.add(config.google().clientId());
				if (config.google().extraClientIds() != null) {
					audiences.addAll(config.google().extraClientIds());
				}
			}
			case APPLE -> {
				jwks = "https://appleid.apple.com/auth/keys";
				issuer = "https://appleid.apple.com";
				audiences.addAll(config.apple().clientIds());
			}
			default -> throw new AppException(ErrorCode.OAUTH_PROVIDER_DISABLED, "No ID token flow for " + provider);
		}
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwks).jwsAlgorithm(SignatureAlgorithm.RS256).build();
		// Google also issues tokens with the issuer written without https://.
		OAuth2TokenValidator<Jwt> issuerValidator = token -> {
			String iss = token.getIssuer() == null ? "" : token.getIssuer().toString();
			return iss.equals(issuer) || iss.equals(issuer.replace("https://", ""))
					? OAuth2TokenValidatorResult.success()
					: OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Wrong issuer " + iss, null));
		};
		OAuth2TokenValidator<Jwt> audienceValidator = token -> token.getAudience()
			.stream()
			.anyMatch(audiences::contains) ? OAuth2TokenValidatorResult.success()
					: OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Wrong audience", null));
		decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), issuerValidator,
				audienceValidator));
		return decoder;
	}

}
