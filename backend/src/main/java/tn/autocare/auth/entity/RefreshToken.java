package tn.autocare.auth.entity;

import java.time.Duration;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * One login session at one point in time. Only the SHA-256 hash of the token is stored.
 * Each refresh creates a new row and revokes the old one ({@link RevokeReason#ROTATED});
 * {@code sessionStartedAt} is carried over so the session list shows when the user really
 * signed in.
 */
@Getter
@Entity
@Table(schema = "auth", name = "refresh_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken extends BaseEntity {

	/**
	 * Two tabs refreshing with the same cookie at the same time must not look like token
	 * theft.
	 */
	public static final Duration ROTATION_GRACE = Duration.ofSeconds(10);

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "token_hash", nullable = false, length = 64)
	private String tokenHash;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "revoked_at")
	private Instant revokedAt;

	@Enumerated(EnumType.STRING)
	@Column(name = "revoke_reason", length = 30)
	private RevokeReason revokeReason;

	@Column(name = "user_agent", length = 255)
	private String userAgent;

	@Column(name = "ip_address", length = 45)
	private String ipAddress;

	@Column(name = "session_started_at", nullable = false)
	private Instant sessionStartedAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private SessionScope scope;

	public static RefreshToken issue(Long userId, String tokenHash, Instant expiresAt, String userAgent,
			String ipAddress, Instant sessionStartedAt, SessionScope scope) {
		RefreshToken token = new RefreshToken();
		token.userId = userId;
		token.tokenHash = tokenHash;
		token.expiresAt = expiresAt;
		token.userAgent = userAgent == null ? null : userAgent.substring(0, Math.min(userAgent.length(), 255));
		token.ipAddress = ipAddress;
		token.sessionStartedAt = sessionStartedAt;
		token.scope = scope;
		return token;
	}

	public boolean isUsable(Instant now) {
		return revokedAt == null && expiresAt.isAfter(now);
	}

	/**
	 * Rotated a moment ago: a concurrent refresh from another tab, not a stolen token.
	 */
	public boolean isWithinRotationGrace(Instant now) {
		return revokeReason == RevokeReason.ROTATED && revokedAt != null && revokedAt.plus(ROTATION_GRACE).isAfter(now)
				&& expiresAt.isAfter(now);
	}

	public void revoke(Instant now, RevokeReason reason) {
		if (revokedAt == null) {
			revokedAt = now;
			revokeReason = reason;
		}
	}

}
