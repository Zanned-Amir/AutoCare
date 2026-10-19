package tn.autocare.shared.security;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Access token signing and token lifetimes. */
@Validated
@ConfigurationProperties(prefix = "autocare.security.jwt")
public record JwtProperties(@NotBlank String secret, @NotBlank String issuer, @NotNull Duration accessTokenTtl,
		@NotNull Duration refreshTokenTtl, @NotNull Duration backofficeRefreshTokenTtl) {
}
