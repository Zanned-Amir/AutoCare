package tn.autocare.maintenance.api;

import java.time.LocalDate;

public record MaintenanceRecordDto(Long id, Long vehicleId, Long serviceId, Long organizationId, Long serviceRequestId,
		LocalDate date, int mileage, String description, String result, String recommendations) {
}
