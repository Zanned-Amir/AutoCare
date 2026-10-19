package tn.autocare.apiaccess.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * A partner key. The full key is "ac_live_&lt;keyId&gt;_&lt;secret&gt;"; only the SHA-256
 * of the secret is stored, so a lost key is rotated, never shown again.
 */
@Getter
@Entity
@Table(schema = "apiaccess", name = "api_keys")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApiKey extends BaseEntity {

	@Column(name = "key_id", nullable = false, unique = true, length = 32)
	private String keyId;

	@Column(name = "secret_hash", nullable = false, length = 64)
	private String secretHash;

	/** Shown in lists to recognise a key: "ac_live_1a2b3c…". */
	@Column(name = "display_prefix", nullable = false, length = 48)
	private String displayPrefix;

	@Column(nullable = false, length = 120)
	private String label;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private ApiKeyEnvironment environment;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private List<String> permissions = new ArrayList<>();

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private ApiKeyStatus status;

	@Column(name = "expires_at")
	private Instant expiresAt;

	/** IPs or CIDR ranges; empty = any IP. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "allowed_ips", nullable = false, columnDefinition = "jsonb")
	private List<String> allowedIps = new ArrayList<>();

	@Column(name = "rate_limit_per_minute", nullable = false)
	private int rateLimitPerMinute;

	@Column(name = "last_used_at")
	private Instant lastUsedAt;

	@Column(name = "last_used_ip", length = 45)
	private String lastUsedIp;

	/** After a rotation the old secret keeps working until previousSecretExpiresAt. */
	@Column(name = "previous_secret_hash", length = 64)
	private String previousSecretHash;

	@Column(name = "previous_secret_expires_at")
	private Instant previousSecretExpiresAt;

	@Column(name = "created_by")
	private Long createdBy;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Column(name = "revoked_reason", length = 255)
	private String revokedReason;

	public static ApiKey create(String keyId, String secretHash, ApiKeyEnvironment environment, String label,
			List<String> permissions, List<String> allowedIps, int rateLimitPerMinute, Instant expiresAt,
			Long createdBy) {
		ApiKey key = new ApiKey();
		key.keyId = keyId;
		key.secretHash = secretHash;
		key.environment = environment;
		key.displayPrefix = environment.prefix() + keyId.substring(0, 8) + "…";
		key.status = ApiKeyStatus.ACTIVE;
		key.createdBy = createdBy;
		key.update(label, permissions, allowedIps, rateLimitPerMinute, expiresAt);
		return key;
	}

	public void update(String label, List<String> permissions, List<String> allowedIps, int rateLimitPerMinute,
			Instant expiresAt) {
		checkNotRevoked();
		this.label = label.trim();
		this.permissions = new ArrayList<>(permissions.stream().distinct().sorted().toList());
		this.allowedIps = new ArrayList<>(allowedIps);
		this.rateLimitPerMinute = rateLimitPerMinute;
		this.expiresAt = expiresAt;
	}

	public void changeStatus(ApiKeyStatus newStatus) {
		checkNotRevoked();
		if (newStatus == ApiKeyStatus.REVOKED) {
			throw new IllegalArgumentException("Use revoke()");
		}
		this.status = newStatus;
	}

	public void rotate(String newSecretHash, Instant previousValidUntil) {
		checkNotRevoked();
		this.previousSecretHash = secretHash;
		this.previousSecretExpiresAt = previousValidUntil;
		this.secretHash = newSecretHash;
	}

	public void revoke(String reason) {
		checkNotRevoked();
		this.status = ApiKeyStatus.REVOKED;
		this.revokedAt = Instant.now();
		this.revokedReason = reason;
		this.previousSecretHash = null;
	}

	private void checkNotRevoked() {
		if (status == ApiKeyStatus.REVOKED) {
			throw new AppException(ErrorCode.API_KEY_REVOKED, "This key is revoked");
		}
	}

}
