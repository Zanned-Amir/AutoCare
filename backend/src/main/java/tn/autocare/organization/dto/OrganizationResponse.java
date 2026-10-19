package tn.autocare.organization.dto;

import java.time.Instant;
import java.util.Map;

import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.api.OrganizationType;

public record OrganizationResponse(Long id, String name, OrganizationType type, OrganizationStatus status, Long ownerId,
		String description, String phone, String governorate, String city, String address, String serviceZone,
		Map<String, String> workingHours, int slotMinutes, int slotCapacity, Double latitude, Double longitude,
		Instant createdAt) {
}
