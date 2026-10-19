package tn.autocare.catalog.config;

import java.time.Duration;

import org.springframework.boot.cache.autoconfigure.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.service.CatalogService;
import tn.autocare.shared.config.CacheConfig;

@Configuration
class CatalogCacheConfig {

	@Bean
	RedisCacheManagerBuilderCustomizer catalogCaches() {
		return builder -> builder.withCacheConfiguration(CatalogService.ACTIVE_SERVICES_CACHE,
				CacheConfig.listOf(AutoServiceDto.class, Duration.ofHours(1)));
	}

}
