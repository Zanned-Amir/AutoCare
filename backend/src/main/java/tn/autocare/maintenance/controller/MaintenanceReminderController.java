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
import tn.autocare.maintenance.dto.MaintenanceReminderResponse;
import tn.autocare.maintenance.dto.SaveMaintenanceReminderRequest;
import tn.autocare.maintenance.service.MaintenanceReminderService;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.vehicle.api.VehiclePermissions;

/** Planned maintenance of the signed-in client's own vehicle. */
@Tag(name = "Maintenance")
@RestController
@RequestMapping("/vehicles/{vehicleId}/reminders")
@RequiredArgsConstructor
public class MaintenanceReminderController {

	private final MaintenanceReminderService reminderService;

	@GetMapping
	@PreAuthorize("@perm.has('" + MaintenancePermissions.HISTORY_READ + "')")
	public List<MaintenanceReminderResponse> listVehicleReminders(@PathVariable Long vehicleId) {
		return reminderService.listVehicleReminders(CurrentUser.id(), vehicleId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public MaintenanceReminderResponse createVehicleReminder(@PathVariable Long vehicleId,
			@Valid @RequestBody SaveMaintenanceReminderRequest request) {
		return reminderService.createVehicleReminder(CurrentUser.id(), vehicleId, request);
	}

	@PutMapping("/{reminderId}")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public MaintenanceReminderResponse updateVehicleReminder(@PathVariable Long vehicleId,
			@PathVariable Long reminderId, @Valid @RequestBody SaveMaintenanceReminderRequest request) {
		return reminderService.updateVehicleReminder(CurrentUser.id(), vehicleId, reminderId, request);
	}

	@PostMapping("/{reminderId}/done")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public MaintenanceReminderResponse completeVehicleReminder(@PathVariable Long vehicleId,
			@PathVariable Long reminderId) {
		return reminderService.completeVehicleReminder(CurrentUser.id(), vehicleId, reminderId);
	}

	@DeleteMapping("/{reminderId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public void deleteVehicleReminder(@PathVariable Long vehicleId, @PathVariable Long reminderId) {
		reminderService.deleteVehicleReminder(CurrentUser.id(), vehicleId, reminderId);
	}

}
