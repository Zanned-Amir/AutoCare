package tn.autocare.organization.dto;

import java.time.Instant;

import tn.autocare.organization.entity.InvitationStatus;
import tn.autocare.organization.entity.MemberRoleKey;

public record InvitationResponse(Long id, String email, MemberRoleKey roleKey, InvitationStatus status,
		Instant expiresAt, Instant createdAt) {
}
