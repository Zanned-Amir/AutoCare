package tn.autocare.auth.entity;

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
 * One-time token (link or OTP) for e-mail verification, password reset or e-mail change.
 * Stored hashed.
 */
@Getter
@Entity
@Table(schema = "auth", name = "auth_tokens")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthToken extends BaseEntity {

	public static final int MAX_OTP_ATTEMPTS = 5;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private AuthTokenType type;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private AuthTokenChannel channel;

	@Column(name = "token_hash", nullable = false, length = 64)
	private String tokenHash;

	/** New address for EMAIL_CHANGE. */
	@Column(name = "target_email", length = 254)
	private String targetEmail;

	/** Phone number being verified for PHONE_VERIFICATION. */
	@Column(name = "target_phone", length = 20)
	private String targetPhone;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "used_at")
	private Instant usedAt;

	@Column(nullable = false)
	private int attempts;

	public static AuthToken issue(Long userId, AuthTokenType type, AuthTokenChannel channel, String tokenHash,
			Instant expiresAt, String targetEmail) {
		AuthToken token = new AuthToken();
		token.userId = userId;
		token.type = type;
		token.channel = channel;
		token.tokenHash = tokenHash;
		token.expiresAt = expiresAt;
		token.targetEmail = targetEmail;
		return token;
	}

	public static AuthToken issueForPhone(Long userId, String tokenHash, Instant expiresAt, String phone) {
		AuthToken token = issue(userId, AuthTokenType.PHONE_VERIFICATION, AuthTokenChannel.OTP, tokenHash, expiresAt,
				null);
		token.targetPhone = phone;
		return token;
	}

	public boolean isUsable(Instant now) {
		return usedAt == null && expiresAt.isAfter(now) && attempts < MAX_OTP_ATTEMPTS;
	}

	public void markUsed(Instant now) {
		usedAt = now;
	}

	/**
	 * A wrong OTP counts; after MAX_OTP_ATTEMPTS the code is dead and a new one must be
	 * requested.
	 */
	public void recordFailedAttempt() {
		attempts++;
	}

}
