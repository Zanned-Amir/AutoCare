package tn.autocare.organization.entity;

import java.util.Map;

/** The editable fields of an organization, shared by create and update. */
public record OrganizationDetails(String name, String description, String phone, String governorate, String city,
		String address, String serviceZone, Map<String, String> workingHours, Double latitude, Double longitude) {
}
