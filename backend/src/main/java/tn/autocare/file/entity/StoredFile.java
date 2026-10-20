package tn.autocare.file.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * Reference to one object in storage. The bytes live in S3/MinIO, never in PostgreSQL.
 */
@Getter
@Entity
@Table(schema = "file", name = "files")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StoredFile extends BaseEntity {

	@Column(name = "storage_key", nullable = false, unique = true)
	private String storageKey;

	@Column(name = "original_name", nullable = false)
	private String originalName;

	@Column(name = "content_type", nullable = false, length = 100)
	private String contentType;

	@Column(name = "size_bytes", nullable = false)
	private long sizeBytes;

	@Enumerated(EnumType.STRING)
	@Column(name = "owner_type", nullable = false, length = 30)
	private FileOwnerType ownerType;

	@Column(name = "owner_id", nullable = false)
	private Long ownerId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private FilePurpose purpose;

	@Column(nullable = false)
	private int position;

	@Column(name = "uploaded_by", nullable = false)
	private Long uploadedBy;

	public static StoredFile record(String storageKey, String originalName, String contentType, long sizeBytes,
			FileOwnerType ownerType, Long ownerId, FilePurpose purpose, int position, Long uploadedBy) {
		StoredFile file = new StoredFile();
		file.storageKey = storageKey;
		file.originalName = originalName;
		file.contentType = contentType;
		file.sizeBytes = sizeBytes;
		file.ownerType = ownerType;
		file.ownerId = ownerId;
		file.purpose = purpose;
		file.position = position;
		file.uploadedBy = uploadedBy;
		return file;
	}

	/**
	 * Place among the owner's files of the same purpose (0 = first, the cover for
	 * photos).
	 */
	public void moveTo(int position) {
		this.position = position;
	}

}
