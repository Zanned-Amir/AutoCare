package tn.autocare.organization.dto;

import java.time.Instant;

import tn.autocare.organization.api.OrganizationType;
import tn.autocare.organization.entity.InvitationStatus;
import tn.autocare.organization.entity.MemberRoleKey;

/** What the invitation page shows before the person accepts. */
public record InvitationPreviewResponse(String organizationName, OrganizationType organizationType, String email,
		MemberRoleKey roleKey, InvitationStatus status, Instant expiresAt) {
}
