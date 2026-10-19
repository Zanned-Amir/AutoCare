package tn.autocare.file.api;

import java.net.URI;

/** {@code url} is a signed, short-lived link (autocare.storage.signed-url-ttl). */
public record StoredFileDto(Long id, FileOwnerType ownerType, Long ownerId, FilePurpose purpose, String originalName,
		String contentType, long sizeBytes, int position, URI url) {
}
