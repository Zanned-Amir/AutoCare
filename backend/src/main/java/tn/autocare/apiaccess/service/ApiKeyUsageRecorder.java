package tn.autocare.apiaccess.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.repository.ApiKeyRepository;
import tn.autocare.apiaccess.repository.ApiKeyUsageRepository;

/**
 * Usage metering: daily counters per key, and "last used" written at most once a minute.
 */
@Component
@RequiredArgsConstructor
public class ApiKeyUsageRecorder {

	private final ApiKeyUsageRepository usageRepository;

	private final ApiKeyRepository apiKeyRepository;

	private final StringRedisTemplate redis;

	@Transactional
	public void recordApiKeyCall(Long apiKeyId, String ip, boolean accepted) {
		usageRepository.addApiKeyUsage(apiKeyId, LocalDate.now(ZoneOffset.UTC), 1, accepted ? 0 : 1);
		if (accepted && Boolean.TRUE
			.equals(redis.opsForValue().setIfAbsent("autocare:apikey:seen:" + apiKeyId, "1", Duration.ofMinutes(1)))) {
			apiKeyRepository.markApiKeyUsed(apiKeyId, Instant.now(), ip);
		}
	}

}
