package tn.autocare.apiaccess.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import tn.autocare.apiaccess.entity.ApiKeyEnvironment;

/** {@code rateLimitPerMinute} defaults to 60; empty {@code allowedIps} = any IP. */
public record CreateApiKeyRequest(@NotBlank @Size(max = 120) String label, ApiKeyEnvironment environment,
		@NotEmpty List<String> permissions, List<String> allowedIps, @Min(1) @Max(10000) Integer rateLimitPerMinute,
		@Future Instant expiresAt) {
}
