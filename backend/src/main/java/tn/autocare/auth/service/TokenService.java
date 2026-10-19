package tn.autocare.auth.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.entity.SessionScope;
import tn.autocare.shared.security.JwtProperties;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.shared.security.SecurityConfig;

@Service
@RequiredArgsConstructor
class TokenService {

	private static final SecureRandom RANDOM = new SecureRandom();

	private final JwtEncoder jwtEncoder;

	private final JwtProperties jwt;

	record AccessToken(String value, Instant expiresAt) {
	}

	AccessToken issueAccessToken(UserAccess access, Long sessionId, SessionScope scope, Instant now) {
		Instant expiresAt = now.plus(jwt.accessTokenTtl());
		JwtClaimsSet claims = JwtClaimsSet.builder()
			.issuer(jwt.issuer())
			.subject(String.valueOf(access.user().getId()))
			.issuedAt(now)
			.expiresAt(expiresAt)
			.claim("email", access.user().getEmail())
			.claim(CurrentUser.SESSION_CLAIM, sessionId)
			.claim(SecurityConfig.SCOPE_CLAIM, scope.claim())
			.claim(SecurityConfig.ROLES_CLAIM, access.roles())
			.claim(SecurityConfig.PERMISSIONS_CLAIM, access.permissions())
			.build();
		JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
		String value = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
		return new AccessToken(value, expiresAt);
	}

	/** 256 random bits, URL-safe: refresh tokens and e-mail links. */
	String generateOpaqueToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	String generateOtp() {
		return String.format("%06d", RANDOM.nextInt(1_000_000));
	}

	String hash(String rawToken) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
			return HexFormat.of().formatHex(digest);
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException(ex);
		}
	}

}
