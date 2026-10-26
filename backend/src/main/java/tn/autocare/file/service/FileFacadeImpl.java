package tn.autocare.file.service;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.file.api.FileFacade;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.api.StoredFileDto;
import tn.autocare.file.api.UploadFileCommand;
import tn.autocare.file.entity.StoredFile;
import tn.autocare.file.repository.StoredFileRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.storage.ObjectStorage;
import tn.autocare.shared.tx.AfterCommit;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class FileFacadeImpl implements FileFacade {

	private final StoredFileRepository fileRepository;

	private final ObjectStorage storage;

	@Override
	@Transactional
	public StoredFileDto uploadFile(UploadFileCommand command) {
		InputStream content = new BufferedInputStream(command.content());
		FileTypes.Detected type = detect(content);
		if (!FileTypes.isAllowed(command.purpose(), type)) {
			throw new AppException(ErrorCode.FILE_TYPE_NOT_ALLOWED,
					"Accepted: " + String.join(", ", FileTypes.acceptedTypes(command.purpose())));
		}
		if (command.sizeBytes() <= 0 || command.sizeBytes() > FileTypes.maxBytes(type)) {
			throw new AppException(ErrorCode.FILE_TOO_LARGE, "Maximum " + FileTypes.maxBytes(type) + " bytes");
		}
		if (FileTypes.isSingle(command.purpose())) {
			fileRepository
				.findAllByOwnerTypeAndOwnerIdAndPurposeOrderByPositionAscIdAsc(command.ownerType(), command.ownerId(),
						command.purpose())
				.forEach(this::remove);
		}
		else if (fileRepository.countByOwnerTypeAndOwnerIdAndPurpose(command.ownerType(), command.ownerId(),
				command.purpose()) >= FileTypes.maxCount(command.purpose())) {
			throw new AppException(ErrorCode.FILE_LIMIT_REACHED,
					"At most " + FileTypes.maxCount(command.purpose()) + " files");
		}

		String key = "%s/%d/%s.%s".formatted(command.ownerType().name().toLowerCase(), command.ownerId(),
				UUID.randomUUID(), type.extension());
		storage.putObject(key, content, command.sizeBytes(), type.contentType());
		AfterCommit.onRollback(() -> deleteObjectQuietly(key));

		int position = fileRepository.findMaxPosition(command.ownerType(), command.ownerId(), command.purpose()) + 1;
		StoredFile file = fileRepository.save(
				StoredFile.record(key, cleanName(command.originalName(), type), type.contentType(), command.sizeBytes(),
						command.ownerType(), command.ownerId(), command.purpose(), position, command.uploadedBy()));
		return toDto(file);
	}

	@Override
	public List<StoredFileDto> listOwnerFiles(FileOwnerType ownerType, Long ownerId, @Nullable FilePurpose purpose) {
		List<StoredFile> files = purpose == null
				? fileRepository.findAllByOwnerTypeAndOwnerIdOrderByPurposeAscPositionAscIdAsc(ownerType, ownerId)
				: fileRepository.findAllByOwnerTypeAndOwnerIdAndPurposeOrderByPositionAscIdAsc(ownerType, ownerId,
						purpose);
		return files.stream().map(this::toDto).toList();
	}

	@Override
	@Transactional
	public List<StoredFileDto> reorderOwnerFiles(FileOwnerType ownerType, Long ownerId, FilePurpose purpose,
			List<Long> fileIds) {
		List<StoredFile> files = fileRepository.findAllByOwnerTypeAndOwnerIdAndPurposeOrderByPositionAscIdAsc(ownerType,
				ownerId, purpose);
		Map<Long, StoredFile> byId = files.stream().collect(Collectors.toMap(StoredFile::getId, f -> f));
		if (fileIds.size() != files.size() || !byId.keySet().equals(new HashSet<>(fileIds))) {
			throw new AppException(ErrorCode.FILE_ORDER_INVALID, "Send every file once");
		}
		for (int i = 0; i < fileIds.size(); i++) {
			byId.get(fileIds.get(i)).moveTo(i);
		}
		return fileIds.stream().map(byId::get).map(this::toDto).toList();
	}

	@Override
	@Transactional
	public void deleteOwnerFile(FileOwnerType ownerType, Long ownerId, Long fileId) {
		remove(fileRepository.findByIdAndOwnerTypeAndOwnerId(fileId, ownerType, ownerId)
			.orElseThrow(() -> AppException.notFound("File", fileId)));
	}

	@Override
	@Transactional
	public void deleteOwnerFiles(FileOwnerType ownerType, Long ownerId) {
		fileRepository.findAllByOwnerTypeAndOwnerIdOrderByPurposeAscPositionAscIdAsc(ownerType, ownerId)
			.forEach(this::remove);
	}

	@Override
	public Map<Long, URI> findOwnerFileUrls(FileOwnerType ownerType, Collection<Long> ownerIds, FilePurpose purpose) {
		if (ownerIds.isEmpty()) {
			return Map.of();
		}
		Map<Long, URI> urls = new LinkedHashMap<>();
		for (StoredFile file : fileRepository.findAllByOwnerTypeAndOwnerIdInAndPurposeOrderByPositionAscIdAsc(ownerType,
				ownerIds, purpose)) {
			urls.putIfAbsent(file.getOwnerId(), storage.createSignedGetUrl(file.getStorageKey()));
		}
		return urls;
	}

	private void remove(StoredFile file) {
		fileRepository.delete(file);
		String key = file.getStorageKey();
		AfterCommit.run(() -> deleteObjectQuietly(key));
	}

	// The row is already gone; a leftover object costs storage, not correctness.
	private void deleteObjectQuietly(String key) {
		try {
			storage.deleteObject(key);
		}
		catch (RuntimeException ex) {
			log.warn("Could not delete stored object {}: {}", key, ex.getMessage());
		}
	}

	private StoredFileDto toDto(StoredFile file) {
		return new StoredFileDto(file.getId(), file.getOwnerType(), file.getOwnerId(), file.getPurpose(),
				file.getOriginalName(), file.getContentType(), file.getSizeBytes(), file.getPosition(),
				storage.createSignedGetUrl(file.getStorageKey()));
	}

	private static FileTypes.Detected detect(InputStream content) {
		try {
			return FileTypes.detect(content)
				.orElseThrow(() -> new AppException(ErrorCode.FILE_TYPE_NOT_ALLOWED, "Unknown file type"));
		}
		catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}

	private static String cleanName(@Nullable String name, FileTypes.Detected type) {
		String base = name == null ? "" : name.replaceAll("[\\\\/\\p{Cntrl}]", "").strip();
		if (base.isEmpty()) {
			base = "fichier." + type.extension();
		}
		return base.length() > 255 ? base.substring(base.length() - 255) : base;
	}

}
