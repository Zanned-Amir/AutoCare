package tn.autocare.apiaccess.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.entity.ApiKey;
import tn.autocare.apiaccess.entity.ApiKeyStatus;
import tn.autocare.apiaccess.repository.ApiKeyRepository;
import tn.autocare.apiaccess.service.ApiKeySecrets;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Checks a presented key in order: format, known key id, secret (current or still-valid
 * previous one), status, expiry, IP allowlist, per-minute rate limit.
 */
@Component
@RequiredArgsConstructor
class ApiKeyAuthenticator {

	private final ApiKeyRepository apiKeyRepository;

	private final ApiKeySecrets secrets;

	private final StringRedisTemplate redis;

	ApiKeyPrincipal authenticate(String presented, String clientIp) {
		if (presented == null || presented.isBlank()) {
			throw new ApiKeyRejectedException(ErrorCode.API_KEY_MISSING, null, 0);
		}
		ApiKeySecrets.Parsed parsed = secrets.parse(presented.trim())
			.orElseThrow(() -> new ApiKeyRejectedException(ErrorCode.API_KEY_INVALID, null, 0));
		ApiKey key = apiKeyRepository.findByKeyId(parsed.keyId())
			.orElseThrow(() -> new ApiKeyRejectedException(ErrorCode.API_KEY_INVALID, null, 0));
		Instant now = Instant.now();
		String hash = secrets.hash(parsed.secret());
		boolean current = matches(hash, key.getSecretHash());
		boolean previous = key.getPreviousSecretHash() != null && key.getPreviousSecretExpiresAt() != null
				&& key.getPreviousSecretExpiresAt().isAfter(now) && matches(hash, key.getPreviousSecretHash());
		if (!current && !previous) {
			throw new ApiKeyRejectedException(ErrorCode.API_KEY_INVALID, null, 0);
		}
		if (key.getStatus() != ApiKeyStatus.ACTIVE) {
			throw new ApiKeyRejectedException(ErrorCode.API_KEY_INACTIVE, key.getId(), 0);
		}
		if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(now)) {
			throw new ApiKeyRejectedException(ErrorCode.API_KEY_EXPIRED, key.getId(), 0);
		}
		if (!key.getAllowedIps().isEmpty()
				&& key.getAllowedIps().stream().noneMatch(range -> new IpAddressMatcher(range).matches(clientIp))) {
			throw new ApiKeyRejectedException(ErrorCode.API_KEY_IP_NOT_ALLOWED, key.getId(), 0);
		}
		checkRateLimit(key, now);
		return new ApiKeyPrincipal(key.getId(), key.getKeyId(), key.getLabel(), key.getEnvironment().name(),
				key.getPermissions());
	}

	/** Fixed one-minute windows in Redis. */
	private void checkRateLimit(ApiKey key, Instant now) {
		long minute = now.getEpochSecond() / 60;
		String counter = "autocare:apikey:rate:" + key.getId() + ":" + minute;
		Long count = redis.opsForValue().increment(counter);
		if (count != null && count == 1) {
			redis.expire(counter, java.time.Duration.ofSeconds(120));
		}
		if (count != null && count > key.getRateLimitPerMinute()) {
			throw new ApiKeyRejectedException(ErrorCode.API_KEY_RATE_LIMITED, key.getId(),
					60 - now.getEpochSecond() % 60);
		}
	}

	private static boolean matches(String hash, String stored) {
		return MessageDigest.isEqual(hash.getBytes(StandardCharsets.UTF_8), stored.getBytes(StandardCharsets.UTF_8));
	}

}
