package tn.autocare.apiaccess.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;

import tn.autocare.apiaccess.security.ApiKeyFilterFactory;

/**
 * /external/** has its own filter chain, checked before the main one: API keys only, no
 * JWT, no cookies. Each endpoint then requires the key permission it needs
 * with @PreAuthorize.
 */
@Configuration
class ExternalApiSecurityConfig {

	@Bean
	@Order(1)
	SecurityFilterChain externalApiFilterChain(HttpSecurity http, ApiKeyFilterFactory filterFactory) throws Exception {
		http.securityMatcher("/external/**")
			.csrf(csrf -> csrf.disable())
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.addFilterBefore(filterFactory.create(), AnonymousAuthenticationFilter.class)
			.authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
		return http.build();
	}

}
