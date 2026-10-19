package tn.autocare.shared.ratelimit;

import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/**
 * Redis counters for cooldowns ("one e-mail every 30 s") and attempt limits ("5 failed
 * logins").
 */
@Component
@RequiredArgsConstructor
public class RequestLimiter {

	private static final String PREFIX = "autocare:limit:";

	private final StringRedisTemplate redis;

	/**
	 * Starts a cooldown if none is running. Returns 0 when the action may go ahead,
	 * otherwise the seconds left before it may.
	 */
	public long acquireCooldown(String key, Duration cooldown) {
		Boolean started = redis.opsForValue().setIfAbsent(PREFIX + key, "1", cooldown);
		if (Boolean.TRUE.equals(started)) {
			return 0;
		}
		Long ttl = redis.getExpire(PREFIX + key);
		return ttl == null || ttl < 1 ? 1 : ttl;
	}

	public boolean isBlocked(String key, int maxAttempts) {
		String value = redis.opsForValue().get(PREFIX + key);
		return value != null && Integer.parseInt(value) >= maxAttempts;
	}

	public long secondsUntilReset(String key) {
		Long ttl = redis.getExpire(PREFIX + key);
		return ttl == null || ttl < 1 ? 1 : ttl;
	}

	/** Counts one failure; the window starts at the first failure. */
	public void recordFailure(String key, Duration window) {
		Long count = redis.opsForValue().increment(PREFIX + key);
		if (count != null && count == 1) {
			redis.expire(PREFIX + key, window);
		}
	}

	public void reset(String key) {
		redis.delete(PREFIX + key);
	}

}
