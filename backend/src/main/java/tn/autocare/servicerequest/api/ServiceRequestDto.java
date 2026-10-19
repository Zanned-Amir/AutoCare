package tn.autocare.servicerequest.api;

import java.time.LocalDate;

public record ServiceRequestDto(Long id, Long userId, Long vehicleId, Long serviceId, Long organizationId,
		LocalDate desiredDate, LocationType locationType, RequestStatus status) {
}
