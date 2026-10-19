package tn.autocare.auth.config;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** OAuth providers. A provider is enabled when its client id is set. */
@ConfigurationProperties(prefix = "autocare.oauth")
public record OAuthProperties(String redirectBaseUrl, Client google, Client facebook, Client github, Apple apple) {

	public record Client(String clientId, String clientSecret, List<String> extraClientIds) {

		public boolean enabled() {
			return clientId != null && !clientId.isBlank();
		}

	}

	public record Apple(List<String> clientIds) {

		public boolean enabled() {
			return clientIds != null && clientIds.stream().anyMatch(id -> !id.isBlank());
		}

	}

}
