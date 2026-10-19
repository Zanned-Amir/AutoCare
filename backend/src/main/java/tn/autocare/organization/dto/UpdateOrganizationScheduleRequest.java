package tn.autocare.organization.dto;

import java.util.Map;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Hours per day key ("mon".."sun"), e.g. "08:00-12:00,14:00-18:00"; a missing day is
 * closed.
 */
public record UpdateOrganizationScheduleRequest(@NotNull Map<String, String> workingHours,
		@NotNull @Min(15) @Max(240) Integer slotMinutes, @NotNull @Min(1) @Max(20) Integer slotCapacity) {
}
