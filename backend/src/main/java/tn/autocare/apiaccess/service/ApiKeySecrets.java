package tn.autocare.apiaccess.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import tn.autocare.apiaccess.entity.ApiKeyEnvironment;

/** Key format "ac_(live|test)_&lt;24 hex key id&gt;_&lt;64 hex secret&gt;". */
@Component
public class ApiKeySecrets {

	private static final Pattern FORMAT = Pattern.compile("^ac_(live|test)_([0-9a-f]{24})_([0-9a-f]{64})$");

	private static final SecureRandom RANDOM = new SecureRandom();

	public record Parsed(String keyId, String secret) {
	}

	public record Generated(String keyId, String secret, String fullKey) {
	}

	public Generated generate(ApiKeyEnvironment environment) {
		String keyId = randomHex(12);
		return withSecret(environment, keyId);
	}

	public Generated withSecret(ApiKeyEnvironment environment, String keyId) {
		String secret = randomHex(32);
		return new Generated(keyId, secret, environment.prefix() + keyId + "_" + secret);
	}

	public Optional<Parsed> parse(String presented) {
		Matcher matcher = FORMAT.matcher(presented);
		return matcher.matches() ? Optional.of(new Parsed(matcher.group(2), matcher.group(3))) : Optional.empty();
	}

	public String hash(String secret) {
		try {
			return HexFormat.of()
				.formatHex(MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException ex) {
			throw new IllegalStateException(ex);
		}
	}

	private static String randomHex(int bytes) {
		byte[] value = new byte[bytes];
		RANDOM.nextBytes(value);
		return HexFormat.of().formatHex(value);
	}

}
