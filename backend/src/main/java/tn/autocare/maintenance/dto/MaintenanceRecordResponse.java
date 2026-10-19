package tn.autocare.maintenance.dto;

import java.time.Instant;
import java.time.LocalDate;
import tn.autocare.maintenance.entity.RecordSource;

/** {@code editable}: a manual entry the owner may change or delete. */
public record MaintenanceRecordResponse(Long id, Long vehicleId, LocalDate date, int mileage, String description,
		String result, String recommendations, RecordSource source, boolean editable, Long serviceRequestId,
		ServiceInfo service, OrganizationInfo organization, Instant createdAt) {

	public record ServiceInfo(Long id, String name) {
	}

	public record OrganizationInfo(Long id, String name) {
	}

}
