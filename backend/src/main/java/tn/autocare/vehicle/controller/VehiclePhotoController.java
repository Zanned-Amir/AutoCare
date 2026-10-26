package tn.autocare.vehicle.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.file.api.FileFacade;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.api.StoredFileDto;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.vehicle.api.VehiclePermissions;
import tn.autocare.vehicle.service.VehicleService;

/** Photos of the signed-in client's own vehicle (up to 8). */
@Tag(name = "Vehicles")
@RestController
@RequestMapping("/vehicles/{vehicleId}/photos")
@RequiredArgsConstructor
public class VehiclePhotoController {

	private final VehicleService vehicleService;

	private final FileFacade fileFacade;

	@GetMapping
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
	public List<StoredFileDto> listVehiclePhotos(@PathVariable Long vehicleId) {
		vehicleService.checkMyVehicle(CurrentUser.id(), vehicleId);
		return fileFacade.listOwnerFiles(FileOwnerType.VEHICLE, vehicleId, FilePurpose.PHOTO);
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public StoredFileDto uploadVehiclePhoto(@PathVariable Long vehicleId, @RequestParam MultipartFile file)
			throws IOException {
		Long userId = CurrentUser.id();
		vehicleService.checkMyVehicle(userId, vehicleId);
		return fileFacade
			.uploadFile(Uploads.toCommand(file, FileOwnerType.VEHICLE, vehicleId, FilePurpose.PHOTO, userId));
	}

	@DeleteMapping("/{fileId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
	public void deleteVehiclePhoto(@PathVariable Long vehicleId, @PathVariable Long fileId) {
		vehicleService.checkMyVehicle(CurrentUser.id(), vehicleId);
		fileFacade.deleteOwnerFile(FileOwnerType.VEHICLE, vehicleId, fileId);
	}

}
