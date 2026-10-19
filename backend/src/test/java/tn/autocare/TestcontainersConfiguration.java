package tn.autocare;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	@Bean
	@ServiceConnection
	PostgreSQLContainer postgresContainer() {
		return new PostgreSQLContainer(DockerImageName.parse("postgres:18-alpine"));
	}

	@Bean
	@ServiceConnection(name = "redis")
	GenericContainer<?> redisContainer() {
		return new GenericContainer<>(DockerImageName.parse("redis:8.6.1")).withExposedPorts(6379);
	}

	/** Catches the e-mails the app sends during tests (sign-up verification, alerts). */
	@Bean
	GenericContainer<?> mailpitContainer() {
		return new GenericContainer<>(DockerImageName.parse("axllent/mailpit:latest")).withExposedPorts(1025);
	}

	/** Object storage for file uploads. Same MinIO mirror as docker-compose.dev.yml. */
	@Bean
	GenericContainer<?> minioContainer() {
		return new GenericContainer<>(DockerImageName.parse("ghcr.io/zanned-amir/minio:latest")).withExposedPorts(9000)
			.withEnv("MINIO_ROOT_USER", "autocare")
			.withEnv("MINIO_ROOT_PASSWORD", "autocare2026")
			.withCommand("server", "/data")
			.waitingFor(Wait.forHttp("/minio/health/ready").forPort(9000));
	}

	@Bean
	DynamicPropertyRegistrar storageProperties(GenericContainer<?> minioContainer) {
		return registry -> registry.add("autocare.storage.endpoint",
				() -> "http://" + minioContainer.getHost() + ":" + minioContainer.getMappedPort(9000));
	}

	@Bean
	DynamicPropertyRegistrar mailProperties(GenericContainer<?> mailpitContainer) {
		return registry -> {
			registry.add("spring.mail.host", mailpitContainer::getHost);
			registry.add("spring.mail.port", () -> mailpitContainer.getMappedPort(1025));
		};
	}

}
