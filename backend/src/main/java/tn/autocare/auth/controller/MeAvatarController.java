package tn.autocare.auth.controller;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
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

/** The signed-in user's profile picture. 204 when there is none. */
@Tag(name = "Me")
@RestController
@RequestMapping("/me/avatar")
@RequiredArgsConstructor
public class MeAvatarController {

	private final FileFacade fileFacade;

	@GetMapping
	public ResponseEntity<StoredFileDto> getMyAvatar() {
		return fileFacade.listOwnerFiles(FileOwnerType.USER, CurrentUser.id(), FilePurpose.AVATAR)
			.stream()
			.findFirst()
			.map(ResponseEntity::ok)
			.orElseGet(() -> ResponseEntity.noContent().build());
	}

	@PutMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public StoredFileDto uploadMyAvatar(@RequestParam MultipartFile file) throws IOException {
		Long userId = CurrentUser.id();
		return fileFacade.uploadFile(Uploads.toCommand(file, FileOwnerType.USER, userId, FilePurpose.AVATAR, userId));
	}

	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteMyAvatar() {
		Long userId = CurrentUser.id();
		fileFacade.listOwnerFiles(FileOwnerType.USER, userId, FilePurpose.AVATAR)
			.forEach(file -> fileFacade.deleteOwnerFile(FileOwnerType.USER, userId, file.id()));
	}

}
