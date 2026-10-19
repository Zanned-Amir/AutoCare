package tn.autocare.apiaccess.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.dto.ApiCapabilityResponse;
import tn.autocare.apiaccess.dto.ApiKeyResponse;
import tn.autocare.apiaccess.dto.ApiKeySecretResponse;
import tn.autocare.apiaccess.dto.ApiKeyUsageResponse;
import tn.autocare.apiaccess.dto.CreateApiKeyRequest;
import tn.autocare.apiaccess.dto.UpdateApiKeyRequest;
import tn.autocare.apiaccess.entity.ApiKey;
import tn.autocare.apiaccess.entity.ApiKeyEnvironment;
import tn.autocare.apiaccess.entity.ApiKeyStatus;
import tn.autocare.apiaccess.entity.ApiPermission;
import tn.autocare.apiaccess.repository.ApiKeyRepository;
import tn.autocare.apiaccess.repository.ApiKeyUsageRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/** Backoffice management of partner keys. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ApiKeyService {

	/**
	 * How long the old secret keeps working after a rotation, so partners can deploy the
	 * new one.
	 */
	static final Duration ROTATION_GRACE = Duration.ofHours(24);

	private final ApiKeyRepository apiKeyRepository;

	private final ApiKeyUsageRepository usageRepository;

	private final ApiKeySecrets secrets;

	public List<ApiCapabilityResponse> listCapabilities() {
		return Arrays.stream(ApiPermission.values())
			.map(p -> new ApiCapabilityResponse(p.value(), p.description()))
			.toList();
	}

	public Page<ApiKeyResponse> listApiKeys(Pageable pageable) {
		return apiKeyRepository.findAll(pageable).map(ApiKeyService::toResponse);
	}

	public ApiKeyResponse getApiKey(Long id) {
		return toResponse(findOrThrow(id));
	}

	public List<ApiKeyUsageResponse> getApiKeyUsage(Long id, int days) {
		findOrThrow(id);
		LocalDate from = LocalDate.now(ZoneOffset.UTC).minusDays(days - 1L);
		return usageRepository.findAllByApiKeyIdAndDayGreaterThanEqualOrderByDayAsc(id, from)
			.stream()
			.map(u -> new ApiKeyUsageResponse(u.getDay(), u.getRequests(), u.getRejected()))
			.toList();
	}

	@Transactional
	public ApiKeySecretResponse createApiKey(Long adminId, CreateApiKeyRequest request) {
		ApiKeyEnvironment environment = request.environment() == null ? ApiKeyEnvironment.LIVE : request.environment();
		ApiKeySecrets.Generated generated = secrets.generate(environment);
		ApiKey key = ApiKey.create(generated.keyId(), secrets.hash(generated.secret()), environment, request.label(),
				checkPermissions(request.permissions()), checkIps(request.allowedIps()),
				request.rateLimitPerMinute() == null ? 60 : request.rateLimitPerMinute(), request.expiresAt(), adminId);
		return new ApiKeySecretResponse(toResponse(apiKeyRepository.save(key)), generated.fullKey());
	}

	@Transactional
	public ApiKeyResponse updateApiKey(Long id, UpdateApiKeyRequest request) {
		ApiKey key = findOrThrow(id);
		key.update(request.label(), checkPermissions(request.permissions()), checkIps(request.allowedIps()),
				request.rateLimitPerMinute(), request.expiresAt());
		return toResponse(key);
	}

	@Transactional
	public ApiKeyResponse changeApiKeyStatus(Long id, String status) {
		ApiKey key = findOrThrow(id);
		key.changeStatus(ApiKeyStatus.valueOf(status));
		return toResponse(key);
	}

	@Transactional
	public ApiKeySecretResponse rotateApiKey(Long id) {
		ApiKey key = findOrThrow(id);
		ApiKeySecrets.Generated generated = secrets.withSecret(key.getEnvironment(), key.getKeyId());
		key.rotate(secrets.hash(generated.secret()), Instant.now().plus(ROTATION_GRACE));
		return new ApiKeySecretResponse(toResponse(key), generated.fullKey());
	}

	@Transactional
	public ApiKeyResponse revokeApiKey(Long id, String reason) {
		ApiKey key = findOrThrow(id);
		key.revoke(reason);
		return toResponse(key);
	}

	@Transactional
	public void deleteApiKey(Long id) {
		apiKeyRepository.delete(findOrThrow(id));
	}

	private ApiKey findOrThrow(Long id) {
		return apiKeyRepository.findById(id).orElseThrow(() -> AppException.notFound("API key", id));
	}

	private static List<String> checkPermissions(List<String> permissions) {
		permissions.forEach(p -> ApiPermission.fromValue(p)
			.orElseThrow(() -> new AppException(ErrorCode.API_KEY_PERMISSION_UNKNOWN, "Unknown permission " + p)));
		return permissions;
	}

	private static List<String> checkIps(List<String> ips) {
		if (ips == null) {
			return List.of();
		}
		List<String> cleaned = ips.stream().map(String::trim).filter(ip -> !ip.isEmpty()).toList();
		for (String ip : cleaned) {
			try {
				new IpAddressMatcher(ip);
			}
			catch (IllegalArgumentException ex) {
				throw new AppException(ErrorCode.API_KEY_IP_INVALID, "Invalid IP or range " + ip);
			}
		}
		return cleaned;
	}

	static ApiKeyResponse toResponse(ApiKey key) {
		return new ApiKeyResponse(key.getId(), key.getKeyId(), key.getDisplayPrefix(), key.getLabel(),
				key.getEnvironment(), key.getPermissions(), key.getStatus(), key.getAllowedIps(),
				key.getRateLimitPerMinute(), key.getExpiresAt(), key.getLastUsedAt(), key.getLastUsedIp(),
				key.getPreviousSecretExpiresAt(), key.getCreatedAt(), key.getRevokedAt(), key.getRevokedReason());
	}

}
