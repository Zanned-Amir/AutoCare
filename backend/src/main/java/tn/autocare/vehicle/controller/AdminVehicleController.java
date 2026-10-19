package tn.autocare.vehicle.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthPermissions;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.service.VehicleService;

@Tag(name = "Admin - Vehicles")
@RestController
@RequiredArgsConstructor
public class AdminVehicleController {

	private final VehicleService vehicleService;

	@GetMapping("/admin/users/{userId}/vehicles")
	@PreAuthorize("@perm.has('" + AuthPermissions.USER_READ + "')")
	public List<VehicleDto> listUserVehicles(@PathVariable Long userId) {
		return vehicleService.listMyVehicles(userId);
	}

}
