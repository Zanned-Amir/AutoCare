package tn.autocare.apiaccess.dto;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateApiKeyRequest(@NotBlank @Size(max = 120) String label, @NotEmpty List<String> permissions,
		List<String> allowedIps, @NotNull @Min(1) @Max(10000) Integer rateLimitPerMinute, Instant expiresAt) {
}
