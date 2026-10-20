package tn.autocare.organization.api;

import java.time.Instant;

/**
 * Published after an organization is created, edited, approved or suspended. Carries the
 * public profile so other modules (provider search) can keep their own copy without
 * reading this module's tables. {@code changedAt} orders events that are handled out of
 * order.
 */
public record OrganizationProfileChanged(Long organizationId, String name, OrganizationType type,
		OrganizationStatus status, String description, String phone, String governorate, String city, String address,
		String serviceZone, Double latitude, Double longitude, Instant changedAt) {
}
