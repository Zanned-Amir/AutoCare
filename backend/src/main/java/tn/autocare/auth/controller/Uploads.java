package tn.autocare.auth.controller;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.api.UploadFileCommand;

final class Uploads {

	private Uploads() {
	}

	static UploadFileCommand toCommand(MultipartFile file, FileOwnerType ownerType, Long ownerId, FilePurpose purpose,
			Long uploadedBy) throws IOException {
		return new UploadFileCommand(ownerType, ownerId, purpose, file.getOriginalFilename(), file.getContentType(),
				file.getSize(), file.getInputStream(), uploadedBy);
	}

}
