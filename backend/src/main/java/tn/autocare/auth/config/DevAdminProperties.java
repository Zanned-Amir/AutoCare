package tn.autocare.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Admin account seeded in the dev and test profiles. */
@ConfigurationProperties(prefix = "autocare.dev")
public record DevAdminProperties(String adminEmail, String adminPassword) {
}
