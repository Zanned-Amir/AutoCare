package tn.autocare.organization.api;

public record OrganizationSummary(Long id, String name, OrganizationType type, OrganizationStatus status, Long ownerId,
		String governorate, String city) {
}
