package tn.autocare.organization.entity;

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
 * An e-mail invitation to join an organization. The invited person may not have an
 * account yet; accepting it creates the member. Only the SHA-256 hash of the token is
 * stored.
 */
@Getter
@Entity
@Table(schema = "organization", name = "organization_invitations")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OrganizationInvitation extends BaseEntity {

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(nullable = false)
	private String email;

	@Enumerated(EnumType.STRING)
	@Column(name = "role_key", nullable = false, length = 40)
	private MemberRoleKey roleKey;

	@Column(name = "token_hash", nullable = false, length = 64)
	private String tokenHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private InvitationStatus status;

	@Column(name = "invited_by", nullable = false)
	private Long invitedBy;

	@Column(name = "expires_at", nullable = false)
	private Instant expiresAt;

	@Column(name = "accepted_by")
	private Long acceptedBy;

	@Column(name = "accepted_at")
	private Instant acceptedAt;

	public static OrganizationInvitation invite(Long organizationId, String email, MemberRoleKey roleKey,
			String tokenHash, Long invitedBy, Instant expiresAt) {
		OrganizationInvitation invitation = new OrganizationInvitation();
		invitation.organizationId = organizationId;
		invitation.email = email.trim().toLowerCase();
		invitation.roleKey = roleKey;
		invitation.tokenHash = tokenHash;
		invitation.status = InvitationStatus.PENDING;
		invitation.invitedBy = invitedBy;
		invitation.expiresAt = expiresAt;
		return invitation;
	}

	/** Past its date, a pending invitation reads as expired. */
	public InvitationStatus statusAt(Instant now) {
		return status == InvitationStatus.PENDING && !now.isBefore(expiresAt) ? InvitationStatus.EXPIRED : status;
	}

	public boolean isOpenAt(Instant now) {
		return statusAt(now) == InvitationStatus.PENDING;
	}

	public boolean isFor(String otherEmail) {
		return email.equalsIgnoreCase(otherEmail.trim());
	}

	public void accept(Long userId, Instant now) {
		this.status = InvitationStatus.ACCEPTED;
		this.acceptedBy = userId;
		this.acceptedAt = now;
	}

	public void revoke() {
		this.status = InvitationStatus.REVOKED;
	}

}
