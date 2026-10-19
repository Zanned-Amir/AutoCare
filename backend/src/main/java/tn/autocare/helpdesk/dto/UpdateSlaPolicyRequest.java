package tn.autocare.helpdesk.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record UpdateSlaPolicyRequest(@Min(1) @Max(43200) int firstResponseMinutes,
		@Min(1) @Max(129600) int resolutionMinutes, boolean active) {
}
