package tn.autocare.diagnostic.config;

import java.time.Duration;

import org.springframework.boot.cache.autoconfigure.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tn.autocare.diagnostic.dto.SymptomFlowResponse;
import tn.autocare.diagnostic.service.DiagnosticFlowService;
import tn.autocare.shared.config.CacheConfig;

@Configuration
class DiagnosticCacheConfig {

	@Bean
	RedisCacheManagerBuilderCustomizer diagnosticCaches() {
		return builder -> builder.withCacheConfiguration(DiagnosticFlowService.FLOWS_CACHE,
				CacheConfig.valueOf(SymptomFlowResponse.class, Duration.ofHours(1)));
	}

}
