package tn.autocare.vehicle.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.file.api.FileFacade;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.api.StoredFileDto;
import tn.autocare.file.api.UploadFileCommand;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehiclePermissions;
import tn.autocare.vehicle.dto.CreateVehicleRequest;
import tn.autocare.vehicle.dto.UpdateVehicleMileageRequest;
import tn.autocare.vehicle.dto.UpdateVehicleRequest;
import tn.autocare.vehicle.dto.VehicleMakeDto;
import tn.autocare.vehicle.service.VehicleCatalogService;
import tn.autocare.vehicle.service.VehicleService;

/**
 * The signed-in client's own vehicles, their photos (up to 8) and the makes offered by
 * the form. A client has a handful of vehicles, so the list is not paged.
 */
@Tag(name = "Vehicles")
@RestController
@RequestMapping("/vehicles")
@RequiredArgsConstructor
public class VehicleController {

	private final VehicleService vehicleService;

	private final VehicleCatalogService catalogService;

	private final FileFacade fileFacade;

	@GetMapping
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public List<VehicleDto> listMyVehicles() {
		return vehicleService.listMyVehicles(CurrentUser.id());
	}

	/** Makes and models offered by the vehicle form; free text stays allowed. */
	@GetMapping("/catalog")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public List<VehicleMakeDto> listVehicleMakes() {
		return catalogService.listVehicleMakes();
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

	@GetMapping("/{vehicleId}/photos")
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public List<StoredFileDto> listVehiclePhotos(@PathVariable Long vehicleId) {
		vehicleService.checkMyVehicle(CurrentUser.id(), vehicleId);
		return fileFacade.listOwnerFiles(FileOwnerType.VEHICLE, vehicleId, FilePurpose.PHOTO);
	}

	@PostMapping(path = "/{vehicleId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public StoredFileDto uploadVehiclePhoto(@PathVariable Long vehicleId, @RequestParam MultipartFile file)
			throws IOException {
		Long userId = CurrentUser.id();
		vehicleService.checkMyVehicle(userId, vehicleId);
		return fileFacade
			.uploadFile(UploadFileCommand.of(file, FileOwnerType.VEHICLE, vehicleId, FilePurpose.PHOTO, userId));
	}

	@DeleteMapping("/{vehicleId}/photos/{fileId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public void deleteVehiclePhoto(@PathVariable Long vehicleId, @PathVariable Long fileId) {
		vehicleService.checkMyVehicle(CurrentUser.id(), vehicleId);
		fileFacade.deleteOwnerFile(FileOwnerType.VEHICLE, vehicleId, fileId);
	}

}
