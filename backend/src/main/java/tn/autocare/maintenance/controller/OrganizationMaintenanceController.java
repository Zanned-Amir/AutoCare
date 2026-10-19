package tn.autocare.maintenance.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.maintenance.api.MaintenancePermissions;
import tn.autocare.maintenance.dto.MaintenanceRecordResponse;
import tn.autocare.maintenance.dto.UpdateMaintenanceReportRequest;
import tn.autocare.maintenance.service.MaintenanceService;
import tn.autocare.servicerequest.api.ServiceRequestPermissions;

/** Work reports written by a provider organization. */
@Tag(name = "Maintenance - Provider")
@RestController
@RequestMapping("/organizations/{organizationId}/maintenance-records")
@RequiredArgsConstructor
public class OrganizationMaintenanceController {

	private final MaintenanceService maintenanceService;

	@GetMapping
	@PreAuthorize("@orgPerm.has(#organizationId, '" + MaintenancePermissions.HISTORY_READ + "')")
	public PagedModel<MaintenanceRecordResponse> listOrganizationRecords(@PathVariable Long organizationId,
			@PageableDefault(size = 20, sort = "date", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(maintenanceService.listOrganizationRecords(organizationId, pageable));
	}

	@PutMapping("/{recordId}/report")
	@PreAuthorize("@orgPerm.has(#organizationId, '" + ServiceRequestPermissions.REQUEST_UPDATE_STATUS + "')")
	public MaintenanceRecordResponse updateMaintenanceReport(@PathVariable Long organizationId,
			@PathVariable Long recordId, @Valid @RequestBody UpdateMaintenanceReportRequest request) {
		return maintenanceService.updateMaintenanceReport(organizationId, recordId, request);
	}

}
