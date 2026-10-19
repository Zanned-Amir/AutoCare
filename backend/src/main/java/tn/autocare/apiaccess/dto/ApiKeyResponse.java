package tn.autocare.apiaccess.dto;

import java.time.Instant;
import java.util.List;

import tn.autocare.apiaccess.entity.ApiKeyEnvironment;
import tn.autocare.apiaccess.entity.ApiKeyStatus;

public record ApiKeyResponse(Long id, String keyId, String displayPrefix, String label, ApiKeyEnvironment environment,
		List<String> permissions, ApiKeyStatus status, List<String> allowedIps, int rateLimitPerMinute,
		Instant expiresAt, Instant lastUsedAt, String lastUsedIp, Instant previousSecretExpiresAt, Instant createdAt,
		Instant revokedAt, String revokedReason) {
}
