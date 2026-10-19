package tn.autocare.organization.entity;

import java.util.List;

import tn.autocare.organization.api.OrganizationType;

/**
 * Role templates (docs/MODULES.md section 2). Adding a member copies the template
 * permissions into the member; editing them afterwards turns the member into
 * {@link #CUSTOM}.
 */
public enum MemberRoleKey {

	PROVIDER_OWNER(OrganizationType.PROVIDER, List.of("*:*")),
	PROVIDER_MANAGER(OrganizationType.PROVIDER,
			List.of("organization:read", "organization:update", "service:*", "request:*", "member:read", "history:read",
					"invoice:read", "ticket:*")),
	PROVIDER_RECEPTIONIST(OrganizationType.PROVIDER,
			List.of("organization:read", "service:read", "request:read", "request:accept", "request:reject")),
	PROVIDER_TECHNICIAN(OrganizationType.PROVIDER, List.of("request:read", "request:update_status", "history:read")),

	SELLER_OWNER(OrganizationType.SELLER, List.of("*:*")),
	SELLER_MANAGER(OrganizationType.SELLER,
			List.of("organization:read", "organization:update", "listing:*", "conversation:*", "member:read",
					"invoice:read")),
	SELLER_STAFF(OrganizationType.SELLER,
			List.of("listing:read", "listing:create", "listing:update", "conversation:*")),

	CUSTOM(null, List.of());

	private final OrganizationType organizationType;

	private final List<String> permissions;

	MemberRoleKey(OrganizationType organizationType, List<String> permissions) {
		this.organizationType = organizationType;
		this.permissions = permissions;
	}

	public List<String> permissions() {
		return permissions;
	}

	public boolean fits(OrganizationType type) {
		return organizationType == type;
	}

	public static MemberRoleKey ownerOf(OrganizationType type) {
		return type == OrganizationType.PROVIDER ? PROVIDER_OWNER : SELLER_OWNER;
	}

}
