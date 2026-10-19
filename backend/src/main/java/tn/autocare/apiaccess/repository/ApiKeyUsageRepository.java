package tn.autocare.apiaccess.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.apiaccess.entity.ApiKeyUsage;

public interface ApiKeyUsageRepository extends JpaRepository<ApiKeyUsage, Long> {

	/** One row per key and day; concurrent requests add to it atomically. */
	@Modifying
	@Query(value = """
			INSERT INTO apiaccess.api_key_usage (api_key_id, day, requests, rejected)
			VALUES (:apiKeyId, :day, :requests, :rejected)
			ON CONFLICT (api_key_id, day) DO UPDATE
			SET requests = api_key_usage.requests + EXCLUDED.requests,
			    rejected = api_key_usage.rejected + EXCLUDED.rejected,
			    updated_at = now()
			""", nativeQuery = true)
	void addApiKeyUsage(Long apiKeyId, LocalDate day, long requests, long rejected);

	List<ApiKeyUsage> findAllByApiKeyIdAndDayGreaterThanEqualOrderByDayAsc(Long apiKeyId, LocalDate from);

}
