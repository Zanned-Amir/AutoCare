package tn.autocare.apiaccess.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.apiaccess.entity.ApiKey;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

	Optional<ApiKey> findByKeyId(String keyId);

	@Modifying
	@Query("update ApiKey k set k.lastUsedAt = :now, k.lastUsedIp = :ip where k.id = :id")
	void markApiKeyUsed(Long id, Instant now, String ip);

}
