package tn.autocare.vehicle.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
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
import tn.autocare.file.api.UploadFileCommand;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.vehicle.api.VehiclePermissions;
import tn.autocare.vehicle.service.VehicleService;

@Tag(name = "Vehicles")
@RestController
@RequestMapping("/vehicles/{vehicleId}/photos")
@RequiredArgsConstructor
public class VehiclePhotoController {

    private final FileFacade fileFacade;

    private final VehicleService vehicleService;

    @GetMapping
    @PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_READ + "')")
    public List<StoredFileDto> list(@PathVariable Long vehicleId) {
        Long ownerId = CurrentUser.id();
        vehicleService.checkMyVehicle(ownerId, vehicleId);
        return fileFacade.listOwnerFiles(FileOwnerType.VEHICLE, vehicleId, FilePurpose.PHOTO);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_UPDATE + "')")
    public StoredFileDto upload(@PathVariable Long vehicleId, @RequestParam("file") MultipartFile file) {
        Long ownerId = CurrentUser.id();
        vehicleService.checkMyVehicle(ownerId, vehicleId);
        try (var content = file.getInputStream()) {
            return fileFacade.uploadFile(new UploadFileCommand(FileOwnerType.VEHICLE, vehicleId, FilePurpose.PHOTO,
                    file.getOriginalFilename(), file.getContentType(), file.getSize(), content, ownerId));
        }
        catch (IOException e) {
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED, "Could not read uploaded file");
        }
    }

    @DeleteMapping("/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@perm.has('" + VehiclePermissions.VEHICLE_DELETE + "')")
    public void delete(@PathVariable Long vehicleId, @PathVariable Long fileId) {
        Long ownerId = CurrentUser.id();
        vehicleService.checkMyVehicle(ownerId, vehicleId);
        fileFacade.deleteOwnerFile(FileOwnerType.VEHICLE, vehicleId, fileId);
    }

}