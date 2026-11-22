package tn.autocare.assistant.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;

/**
 * The ai-service microservice. {@code enabled = false} (default, and in tests) keeps
 * Kafka unused and makes the chat answer ASSISTANT_UNAVAILABLE.
 */
@Validated
@ConfigurationProperties(prefix = "autocare.assistant")
public record AssistantProperties(boolean enabled, @NotBlank String url, @NotBlank String internalToken,
		@NotBlank String eventsTopic, @NotBlank String suggestionsTopic) {
}
