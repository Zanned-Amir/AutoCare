package tn.autocare.organization.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
import tn.autocare.organization.api.OrganizationPermissions;
import tn.autocare.organization.dto.ReorderFilesRequest;
import tn.autocare.shared.security.CurrentUser;

/**
 * Logo and photos (shown on the public provider profile, up to 8 photos) and approval
 * documents (registre de commerce, patente) checked before approval. Members with
 * {@code organization:update} manage them in their workspace; staff who approve
 * organizations manage any organization's files under {@code /admin} (one signed up by
 * phone, for example).
 */
@Tag(name = "Organizations")
@RestController
@RequiredArgsConstructor
public class OrganizationFileController {

	private static final String CAN_READ = "@orgPerm.has(#organizationId, '" + OrganizationPermissions.ORGANIZATION_READ
			+ "')";

	private static final String CAN_UPDATE = "@orgPerm.has(#organizationId, '"
			+ OrganizationPermissions.ORGANIZATION_UPDATE + "')";

	private static final String CAN_ADMIN = "@perm.has('" + OrganizationPermissions.ORGANIZATION_APPROVE + "')";

	private final FileFacade fileFacade;

	@GetMapping("/organizations/{organizationId}/logo")
	@PreAuthorize(CAN_READ)
	public ResponseEntity<StoredFileDto> getOrganizationLogo(@PathVariable Long organizationId) {
		return findLogo(organizationId);
	}

	@PutMapping(path = "/organizations/{organizationId}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize(CAN_UPDATE)
	public StoredFileDto uploadOrganizationLogo(@PathVariable Long organizationId, @RequestParam MultipartFile file)
			throws IOException {
		return upload(organizationId, file, FilePurpose.LOGO);
	}

	@DeleteMapping("/organizations/{organizationId}/logo")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_UPDATE)
	public void deleteOrganizationLogo(@PathVariable Long organizationId) {
		deleteLogo(organizationId);
	}

	@GetMapping("/organizations/{organizationId}/photos")
	@PreAuthorize(CAN_READ)
	public List<StoredFileDto> listOrganizationPhotos(@PathVariable Long organizationId) {
		return list(organizationId, FilePurpose.PHOTO);
	}

	@PostMapping(path = "/organizations/{organizationId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_UPDATE)
	public StoredFileDto uploadOrganizationPhoto(@PathVariable Long organizationId, @RequestParam MultipartFile file)
			throws IOException {
		return upload(organizationId, file, FilePurpose.PHOTO);
	}

	@DeleteMapping("/organizations/{organizationId}/photos/{fileId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_UPDATE)
	public void deleteOrganizationPhoto(@PathVariable Long organizationId, @PathVariable Long fileId) {
		fileFacade.deleteOwnerFile(FileOwnerType.ORGANIZATION, organizationId, fileId);
	}

	/** The first photo is the cover in search and on the profile. */
	@PutMapping("/organizations/{organizationId}/photos/order")
	@PreAuthorize(CAN_UPDATE)
	public List<StoredFileDto> reorderOrganizationPhotos(@PathVariable Long organizationId,
			@Valid @RequestBody ReorderFilesRequest request) {
		return fileFacade.reorderOwnerFiles(FileOwnerType.ORGANIZATION, organizationId, FilePurpose.PHOTO,
				request.fileIds());
	}

	@GetMapping("/organizations/{organizationId}/documents")
	@PreAuthorize(CAN_UPDATE)
	public List<StoredFileDto> listOrganizationDocuments(@PathVariable Long organizationId) {
		return list(organizationId, FilePurpose.DOCUMENT);
	}

	@PostMapping(path = "/organizations/{organizationId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_UPDATE)
	public StoredFileDto uploadOrganizationDocument(@PathVariable Long organizationId, @RequestParam MultipartFile file)
			throws IOException {
		return upload(organizationId, file, FilePurpose.DOCUMENT);
	}

	@DeleteMapping("/organizations/{organizationId}/documents/{fileId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_UPDATE)
	public void deleteOrganizationDocument(@PathVariable Long organizationId, @PathVariable Long fileId) {
		fileFacade.deleteOwnerFile(FileOwnerType.ORGANIZATION, organizationId, fileId);
	}

	@GetMapping("/admin/organizations/{organizationId}/logo")
	@PreAuthorize(CAN_ADMIN)
	public ResponseEntity<StoredFileDto> getOrganizationLogoForAdmin(@PathVariable Long organizationId) {
		return findLogo(organizationId);
	}

	@PutMapping(path = "/admin/organizations/{organizationId}/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@PreAuthorize(CAN_ADMIN)
	public StoredFileDto uploadOrganizationLogoForAdmin(@PathVariable Long organizationId,
			@RequestParam MultipartFile file) throws IOException {
		return upload(organizationId, file, FilePurpose.LOGO);
	}

	@DeleteMapping("/admin/organizations/{organizationId}/logo")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_ADMIN)
	public void deleteOrganizationLogoForAdmin(@PathVariable Long organizationId) {
		deleteLogo(organizationId);
	}

	@GetMapping("/admin/organizations/{organizationId}/photos")
	@PreAuthorize(CAN_ADMIN)
	public List<StoredFileDto> listOrganizationPhotosForAdmin(@PathVariable Long organizationId) {
		return list(organizationId, FilePurpose.PHOTO);
	}

	@PostMapping(path = "/admin/organizations/{organizationId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_ADMIN)
	public StoredFileDto uploadOrganizationPhotoForAdmin(@PathVariable Long organizationId,
			@RequestParam MultipartFile file) throws IOException {
		return upload(organizationId, file, FilePurpose.PHOTO);
	}

	@DeleteMapping("/admin/organizations/{organizationId}/photos/{fileId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_ADMIN)
	public void deleteOrganizationPhotoForAdmin(@PathVariable Long organizationId, @PathVariable Long fileId) {
		fileFacade.deleteOwnerFile(FileOwnerType.ORGANIZATION, organizationId, fileId);
	}

	@PutMapping("/admin/organizations/{organizationId}/photos/order")
	@PreAuthorize(CAN_ADMIN)
	public List<StoredFileDto> reorderAdminOrganizationPhotos(@PathVariable Long organizationId,
			@Valid @RequestBody ReorderFilesRequest request) {
		return fileFacade.reorderOwnerFiles(FileOwnerType.ORGANIZATION, organizationId, FilePurpose.PHOTO,
				request.fileIds());
	}

	@GetMapping("/admin/organizations/{organizationId}/documents")
	@PreAuthorize(CAN_ADMIN)
	public List<StoredFileDto> listOrganizationDocumentsForReview(@PathVariable Long organizationId) {
		return list(organizationId, FilePurpose.DOCUMENT);
	}

	@PostMapping(path = "/admin/organizations/{organizationId}/documents",
			consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_ADMIN)
	public StoredFileDto uploadOrganizationDocumentForAdmin(@PathVariable Long organizationId,
			@RequestParam MultipartFile file) throws IOException {
		return upload(organizationId, file, FilePurpose.DOCUMENT);
	}

	@DeleteMapping("/admin/organizations/{organizationId}/documents/{fileId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_ADMIN)
	public void deleteOrganizationDocumentForAdmin(@PathVariable Long organizationId, @PathVariable Long fileId) {
		fileFacade.deleteOwnerFile(FileOwnerType.ORGANIZATION, organizationId, fileId);
	}

	private ResponseEntity<StoredFileDto> findLogo(Long organizationId) {
		return list(organizationId, FilePurpose.LOGO).stream()
			.findFirst()
			.map(ResponseEntity::ok)
			.orElseGet(() -> ResponseEntity.noContent().build());
	}

	private void deleteLogo(Long organizationId) {
		list(organizationId, FilePurpose.LOGO)
			.forEach(file -> fileFacade.deleteOwnerFile(FileOwnerType.ORGANIZATION, organizationId, file.id()));
	}

	private List<StoredFileDto> list(Long organizationId, FilePurpose purpose) {
		return fileFacade.listOwnerFiles(FileOwnerType.ORGANIZATION, organizationId, purpose);
	}

	private StoredFileDto upload(Long organizationId, MultipartFile file, FilePurpose purpose) throws IOException {
		return fileFacade
			.uploadFile(Uploads.toCommand(file, FileOwnerType.ORGANIZATION, organizationId, purpose, CurrentUser.id()));
	}

}
