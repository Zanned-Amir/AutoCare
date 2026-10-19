package tn.autocare.shared.security;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import jakarta.servlet.DispatcherType;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	/** JWT claim holding the platform permissions ({@code resource:action}). */
	public static final String PERMISSIONS_CLAIM = "perms";

	/** JWT claim holding the session scope: "customer" or "backoffice". */
	public static final String SCOPE_CLAIM = "scope";

	/** Authority given to backoffice sessions; required on /admin/**. */
	public static final String BACKOFFICE_SESSION = "SESSION_BACKOFFICE";

	/** JWT claim holding the platform role names. */
	public static final String ROLES_CLAIM = "roles";

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http.csrf(csrf -> csrf.disable()).cors(cors -> {
		})
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth.dispatcherTypeMatchers(DispatcherType.ASYNC)
				.permitAll()
				.requestMatchers("/auth/**", "/docs/**", "/actuator/health/**", "/error",
						"/integrations/telegram/webhook")
				.permitAll()
				.requestMatchers(HttpMethod.GET, "/catalog/**", "/providers/**")
				.permitAll()
				// A customer session never reaches the backoffice, even for an admin
				// account.
				.requestMatchers("/admin/**")
				.hasAuthority(BACKOFFICE_SESSION)
				.anyRequest()
				.authenticated())
			.oauth2ResourceServer(rs -> rs.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return PasswordEncoderFactories.createDelegatingPasswordEncoder();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(HttpSecurityProperties httpSecurity) {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(httpSecurity.cors().allowedOrigins());
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("*"));
		config.setAllowCredentials(true);
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}

	private static JwtAuthenticationConverter jwtAuthenticationConverter() {
		JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(SecurityConfig::extractAuthorities);
		return converter;
	}

	private static Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
		List<GrantedAuthority> authorities = new ArrayList<>();
		List<String> perms = jwt.getClaimAsStringList(PERMISSIONS_CLAIM);
		if (perms != null) {
			perms.forEach(p -> authorities.add(new SimpleGrantedAuthority(p)));
		}
		List<String> roles = jwt.getClaimAsStringList(ROLES_CLAIM);
		if (roles != null) {
			roles.forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_" + r)));
		}
		if ("backoffice".equals(jwt.getClaimAsString(SCOPE_CLAIM))) {
			authorities.add(new SimpleGrantedAuthority(BACKOFFICE_SESSION));
		}
		return authorities;
	}

}
