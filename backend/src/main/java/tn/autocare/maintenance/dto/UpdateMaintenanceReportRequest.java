package tn.autocare.maintenance.dto;

import jakarta.validation.constraints.Size;

public record UpdateMaintenanceReportRequest(@Size(max = 2000) String result,
		@Size(max = 2000) String recommendations) {
}
