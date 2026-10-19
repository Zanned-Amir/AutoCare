package tn.autocare.file.api;

import java.net.URI;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;

/**
 * Stored files for every module. The owner module checks who may touch its files before
 * calling; this module checks type, size and count. Implemented by
 * {@code tn.autocare.file.service.FileFacadeImpl}.
 */
public interface FileFacade {

	/**
	 * Avatars and logos replace the previous one; photos and documents are added up to a
	 * limit.
	 */
	StoredFileDto uploadFile(UploadFileCommand command);

	List<StoredFileDto> listOwnerFiles(FileOwnerType ownerType, Long ownerId, @Nullable FilePurpose purpose);

	/** 404 when the file does not belong to this owner. */
	void deleteOwnerFile(FileOwnerType ownerType, Long ownerId, Long fileId);

	/** Removes every file of a deleted owner. */
	void deleteOwnerFiles(FileOwnerType ownerType, Long ownerId);

	/**
	 * Signed URL of each owner's first file of that purpose (logos on search results).
	 */
	Map<Long, URI> findOwnerFileUrls(FileOwnerType ownerType, Collection<Long> ownerIds, FilePurpose purpose);

}
