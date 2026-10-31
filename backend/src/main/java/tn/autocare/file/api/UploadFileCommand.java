package tn.autocare.file.api;

import java.io.IOException;
import java.io.InputStream;

import org.springframework.web.multipart.MultipartFile;

public record UploadFileCommand(FileOwnerType ownerType, Long ownerId, FilePurpose purpose, String originalName,
		String contentType, long sizeBytes, InputStream content, Long uploadedBy) {

	/** The command for a file received by an owner module's upload endpoint. */
	public static UploadFileCommand of(MultipartFile file, FileOwnerType ownerType, Long ownerId, FilePurpose purpose,
			Long uploadedBy) throws IOException {
		return new UploadFileCommand(ownerType, ownerId, purpose, file.getOriginalFilename(), file.getContentType(),
				file.getSize(), file.getInputStream(), uploadedBy);
	}

}
