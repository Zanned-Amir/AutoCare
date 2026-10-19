package tn.autocare.shared.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables @Async (e-mail sending). Runs on virtual threads
 * (spring.threads.virtual.enabled).
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

}
