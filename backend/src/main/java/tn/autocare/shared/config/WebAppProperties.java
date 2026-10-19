package tn.autocare.shared.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/** Public origin of the web app, used to build links in e-mails and OAuth redirects. */
@Validated
@ConfigurationProperties(prefix = "autocare.web")
public record WebAppProperties(@NotBlank String baseUrl) {
}
