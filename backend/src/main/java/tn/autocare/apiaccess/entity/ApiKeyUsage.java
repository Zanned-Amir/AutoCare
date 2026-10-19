package tn.autocare.apiaccess.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * Requests and rejections of one key on one day (written by
 * ApiKeyUsageRepository.addApiKeyUsage).
 */
@Getter
@Entity
@Table(schema = "apiaccess", name = "api_key_usage")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApiKeyUsage extends BaseEntity {

	@Column(name = "api_key_id", nullable = false)
	private Long apiKeyId;

	@Column(nullable = false)
	private LocalDate day;

	@Column(nullable = false)
	private long requests;

	@Column(nullable = false)
	private long rejected;

}
