package tn.autocare.organization.config;

import java.time.Duration;

import org.springframework.boot.cache.autoconfigure.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tn.autocare.organization.service.MemberPermissionCache;
import tn.autocare.shared.config.CacheConfig;

@Configuration
class OrganizationCacheConfig {

	@Bean
	RedisCacheManagerBuilderCustomizer organizationCaches() {
		return builder -> builder.withCacheConfiguration(MemberPermissionCache.CACHE_NAME,
				CacheConfig.listOf(String.class, Duration.ofMinutes(30)));
	}

}
