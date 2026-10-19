package tn.autocare.file.api;

import java.io.InputStream;

public record UploadFileCommand(FileOwnerType ownerType, Long ownerId, FilePurpose purpose, String originalName,
		String contentType, long sizeBytes, InputStream content, Long uploadedBy) {
}
