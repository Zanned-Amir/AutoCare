package tn.autocare.maintenance.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** At least one of {@code dueDate} and {@code dueMileage}. */
public record SaveMaintenanceReminderRequest(@NotBlank @Size(max = 120) String title, Long serviceId, LocalDate dueDate,
		@Min(0) @Max(2_000_000) Integer dueMileage, @Size(max = 500) String note) {
}
