package tn.autocare.vehicle.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.autocare.vehicle.api.VehiclePermissions;
import tn.autocare.vehicle.dto.VehicleMakeDto;
import tn.autocare.vehicle.service.VehicleCatalogService;

import java.util.List;

/** Makes and models offered by the vehicle form; free text stays allowed. */
@Tag(name = "Vehicles")
@RestController
@RequestMapping("/vehicles/catalog")
@RequiredArgsConstructor
public class VehicleCatalogController {

	private final VehicleCatalogService catalogService;

	@GetMapping
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public List<VehicleMakeDto> listVehicleMakes() {
		return catalogService.listVehicleMakes();
	}

}
