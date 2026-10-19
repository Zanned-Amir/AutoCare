package tn.autocare.apiaccess.security;

import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.LocaleResolver;

import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.service.ApiKeyUsageRecorder;
import tools.jackson.databind.json.JsonMapper;

/**
 * Builds the filter for the external chain (it must not become a global servlet filter
 * bean).
 */
@Component
@RequiredArgsConstructor
public class ApiKeyFilterFactory {

	private final ApiKeyAuthenticator authenticator;

	private final ApiKeyUsageRecorder usageRecorder;

	private final MessageSource messageSource;

	private final LocaleResolver localeResolver;

	private final JsonMapper jsonMapper;

	public jakarta.servlet.Filter create() {
		return new ApiKeyAuthenticationFilter(authenticator, usageRecorder, messageSource, localeResolver, jsonMapper);
	}

}
