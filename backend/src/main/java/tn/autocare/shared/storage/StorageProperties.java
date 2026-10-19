package tn.autocare.shared.storage;

import java.net.URI;
import java.time.Duration;

import org.jspecify.annotations.Nullable;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** S3 or MinIO connection. */
@Validated
@ConfigurationProperties(prefix = "autocare.storage")
public record StorageProperties(@NotNull URI endpoint, @Nullable URI publicEndpoint, @NotBlank String region,
		@NotBlank String accessKey, @NotBlank String secretKey, @NotBlank String bucket, boolean pathStyleAccess,
		@NotNull Duration signedUrlTtl) {

	/** Host put in signed URLs; the API's own endpoint when not set. */
	public URI signedUrlEndpoint() {
		return publicEndpoint != null ? publicEndpoint : endpoint;
	}

}
