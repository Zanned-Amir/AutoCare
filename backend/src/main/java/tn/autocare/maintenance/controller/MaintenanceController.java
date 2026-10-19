package tn.autocare.maintenance.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.maintenance.api.MaintenancePermissions;
import tn.autocare.maintenance.dto.MaintenanceRecordResponse;
import tn.autocare.maintenance.dto.SaveMaintenanceRecordRequest;
import tn.autocare.maintenance.service.MaintenanceService;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.vehicle.api.VehiclePermissions;

/** History of the signed-in client's own vehicle. */
@Tag(name = "Maintenance")
@RestController
@RequestMapping("/vehicles/{vehicleId}/maintenance-records")
@RequiredArgsConstructor
public class MaintenanceController {

	private final MaintenanceService maintenanceService;

	@GetMapping
	@PreAuthorize("@perm.has('" + MaintenancePermissions.HISTORY_READ + "')")
	public List<MaintenanceRecordResponse> listVehicleHistory(@PathVariable Long vehicleId) {
		return maintenanceService.listVehicleHistory(CurrentUser.id(), vehicleId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public MaintenanceRecordResponse createManualRecord(@PathVariable Long vehicleId,
			@Valid @RequestBody SaveMaintenanceRecordRequest request) {
		return maintenanceService.createManualRecord(CurrentUser.id(), vehicleId, request);
	}

	@PutMapping("/{recordId}")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public MaintenanceRecordResponse updateManualRecord(@PathVariable Long vehicleId, @PathVariable Long recordId,
			@Valid @RequestBody SaveMaintenanceRecordRequest request) {
		return maintenanceService.updateManualRecord(CurrentUser.id(), vehicleId, recordId, request);
	}

	@DeleteMapping("/{recordId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public void deleteManualRecord(@PathVariable Long vehicleId, @PathVariable Long recordId) {
		maintenanceService.deleteManualRecord(CurrentUser.id(), vehicleId, recordId);
	}

}
