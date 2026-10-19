package tn.autocare.maintenance.dto;

import java.time.LocalDate;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveMaintenanceRecordRequest(@NotNull LocalDate date, @NotNull @Min(0) @Max(2_000_000) Integer mileage,
		Long serviceId, @NotBlank @Size(max = 500) String description, @Size(max = 2000) String result) {
}
