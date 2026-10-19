package tn.autocare.vehicle.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehiclePermissions;
import tn.autocare.vehicle.dto.CreateVehicleRequest;
import tn.autocare.vehicle.dto.UpdateVehicleMileageRequest;
import tn.autocare.vehicle.dto.UpdateVehicleRequest;
import tn.autocare.vehicle.service.VehicleService;

/**
 * The signed-in client's own vehicles. A client has a handful, so the list is not paged.
 */
@Tag(name = "Vehicles")
@RestController
@RequestMapping("/vehicles")
@RequiredArgsConstructor
public class VehicleController {

	private final VehicleService vehicleService;

	@GetMapping
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public List<VehicleDto> listMyVehicles() {
		return vehicleService.listMyVehicles(CurrentUser.id());
	}

	@GetMapping("/{vehicleId}")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public VehicleDto getMyVehicle(@PathVariable Long vehicleId) {
		return vehicleService.getMyVehicle(CurrentUser.id(), vehicleId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_CREATE + "')")
	public VehicleDto createVehicle(@Valid @RequestBody CreateVehicleRequest request) {
		return vehicleService.createVehicle(CurrentUser.id(), request);
	}

	@PutMapping("/{vehicleId}")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public VehicleDto updateVehicle(@PathVariable Long vehicleId, @Valid @RequestBody UpdateVehicleRequest request) {
		return vehicleService.updateVehicle(CurrentUser.id(), vehicleId, request);
	}

	@PatchMapping("/{vehicleId}/mileage")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public VehicleDto updateVehicleMileage(@PathVariable Long vehicleId,
			@Valid @RequestBody UpdateVehicleMileageRequest request) {
		return vehicleService.updateVehicleMileage(CurrentUser.id(), vehicleId, request);
	}

	@DeleteMapping("/{vehicleId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_DELETE + "')")
	public void deleteVehicle(@PathVariable Long vehicleId) {
		vehicleService.deleteVehicle(CurrentUser.id(), vehicleId);
	}

}
