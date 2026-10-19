package tn.autocare.shared.security;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** CORS and cookie settings of the HTTP API. */
@ConfigurationProperties(prefix = "autocare.security")
public record HttpSecurityProperties(Cors cors, boolean cookieSecure) {

	public record Cors(List<String> allowedOrigins) {
	}

}
