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

/** A provider account (Google, GitHub...) linked to a user. */
@Getter
@Entity
@Table(schema = "auth", name = "oauth_accounts")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OAuthAccount extends BaseEntity {

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private OAuthProvider provider;

	/** The provider's stable user id ("sub"). */
	@Column(name = "provider_account_id", nullable = false, length = 255)
	private String providerAccountId;

	@Column(name = "provider_email", length = 254)
	private String providerEmail;

	@Column(name = "display_name", length = 120)
	private String displayName;

	@Column(name = "picture_url", length = 500)
	private String pictureUrl;

	@Column(name = "last_used_at")
	private Instant lastUsedAt;

	public static OAuthAccount link(Long userId, OAuthProfileData profile) {
		OAuthAccount account = new OAuthAccount();
		account.userId = userId;
		account.provider = profile.provider();
		account.providerAccountId = profile.subject();
		account.refresh(profile);
		return account;
	}

	public void refresh(OAuthProfileData profile) {
		this.providerEmail = profile.email();
		this.displayName = profile.name() == null ? null
				: profile.name().substring(0, Math.min(120, profile.name().length()));
		this.pictureUrl = profile.pictureUrl() == null || profile.pictureUrl().length() > 500 ? null
				: profile.pictureUrl();
		this.lastUsedAt = Instant.now();
	}

}
