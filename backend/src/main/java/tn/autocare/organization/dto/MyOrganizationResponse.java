package tn.autocare.organization.dto;

import java.util.List;

import tn.autocare.organization.entity.MemberRoleKey;

/** An organization the current user belongs to, with their role and permissions in it. */
public record MyOrganizationResponse(OrganizationResponse organization, MemberRoleKey roleKey,
		List<String> permissions) {
}
