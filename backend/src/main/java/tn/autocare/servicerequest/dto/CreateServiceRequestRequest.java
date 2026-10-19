package tn.autocare.servicerequest.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.autocare.servicerequest.api.LocationType;

public record CreateServiceRequestRequest(@NotNull Long organizationId, @NotNull Long serviceId,
		@NotNull Long vehicleId, Long diagnosticId, @NotNull LocalDate desiredDate, LocalTime desiredTime,
		@NotNull LocationType locationType, @Size(max = 300) String location, @Size(max = 1000) String note) {
}
