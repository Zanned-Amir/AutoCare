package tn.autocare.file.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.entity.StoredFile;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

	List<StoredFile> findAllByOwnerTypeAndOwnerIdOrderByPurposeAscPositionAscIdAsc(FileOwnerType ownerType,
			Long ownerId);

	List<StoredFile> findAllByOwnerTypeAndOwnerIdAndPurposeOrderByPositionAscIdAsc(FileOwnerType ownerType,
			Long ownerId, FilePurpose purpose);

	List<StoredFile> findAllByOwnerTypeAndOwnerIdInAndPurposeOrderByPositionAscIdAsc(FileOwnerType ownerType,
			Collection<Long> ownerIds, FilePurpose purpose);

	Optional<StoredFile> findByIdAndOwnerTypeAndOwnerId(Long id, FileOwnerType ownerType, Long ownerId);

	long countByOwnerTypeAndOwnerIdAndPurpose(FileOwnerType ownerType, Long ownerId, FilePurpose purpose);

	@Query("select coalesce(max(f.position), -1) from StoredFile f where f.ownerType = ?1 and f.ownerId = ?2 and f.purpose = ?3")
	int findMaxPosition(FileOwnerType ownerType, Long ownerId, FilePurpose purpose);

}
