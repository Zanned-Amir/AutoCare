package tn.autocare.organization.dto;

import java.time.Instant;

import tn.autocare.organization.entity.MemberRoleKey;
import tn.autocare.organization.entity.MemberStatus;

/** One organization a user belongs to, whatever the member status (backoffice). */
public record UserMembershipResponse(Long memberId, OrganizationResponse organization, MemberRoleKey roleKey,
		MemberStatus status, Instant joinedAt) {
}
