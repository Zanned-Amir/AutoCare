package tn.autocare.provider.repository;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;
import tn.autocare.provider.entity.ProviderProfile;

public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, Long> {

	Optional<ProviderProfile> findByOrganizationId(Long organizationId);

	/**
	 * Creates the row if missing without failing when a concurrent sync created it first.
	 */
	@Modifying
	@Query(value = """
			INSERT INTO provider.provider_profiles (organization_id, name, phone, governorate, city)
			VALUES (:organizationId, :name, :phone, :governorate, :city)
			ON CONFLICT (organization_id) DO NOTHING
			""", nativeQuery = true)
	void insertIfMissing(Long organizationId, String name, String phone, String governorate, String city);

	/** Serializes concurrent syncs of one organization. */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("select p from ProviderProfile p where p.organizationId = :organizationId")
	Optional<ProviderProfile> lockByOrganizationId(Long organizationId);

	Optional<ProviderProfile> findByOrganizationIdAndVisibleTrue(Long organizationId);

	/**
	 * Visible providers matching every given filter. A null filter is ignored; the CASTs
	 * tell PostgreSQL the parameter type when the value is null. {@code tsQuery} is built
	 * by ProviderSearchService (prefix match on every word). With {@code lat}/{@code lng}
	 * the nearest come first (great-circle distance in km); {@code radiusKm} also
	 * filters.
	 */
	@Query(value = """
			SELECT p.* FROM provider.provider_profiles p
			WHERE p.visible
			  AND (CAST(:governorate AS text) IS NULL OR p.governorate = CAST(:governorate AS text))
			  AND (CAST(:tsQuery AS text) IS NULL OR p.search_vector @@ to_tsquery('simple', CAST(:tsQuery AS text)))
			  AND EXISTS (
			      SELECT 1 FROM provider.provider_services s
			      WHERE s.organization_id = p.organization_id
			        AND (CAST(:serviceId AS bigint) IS NULL OR s.service_id = CAST(:serviceId AS bigint))
			        AND (CAST(:atHome AS boolean) IS NULL OR NOT CAST(:atHome AS boolean) OR s.at_home))
			  AND (CAST(:lat AS double precision) IS NULL OR CAST(:radiusKm AS double precision) IS NULL
			       OR (p.latitude IS NOT NULL AND (6371 * 2 * asin(sqrt(power(sin(radians(p.latitude - CAST(:lat AS double precision)) / 2), 2) + cos(radians(CAST(:lat AS double precision))) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - CAST(:lng AS double precision)) / 2), 2)))) <= CAST(:radiusKm AS double precision)))
			ORDER BY CASE WHEN CAST(:lat AS double precision) IS NULL OR p.latitude IS NULL THEN 0
			              ELSE (6371 * 2 * asin(sqrt(power(sin(radians(p.latitude - CAST(:lat AS double precision)) / 2), 2) + cos(radians(CAST(:lat AS double precision))) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - CAST(:lng AS double precision)) / 2), 2)))) END, p.name
			""",
			countQuery = """
					SELECT count(*) FROM provider.provider_profiles p
					WHERE p.visible
					  AND (CAST(:governorate AS text) IS NULL OR p.governorate = CAST(:governorate AS text))
					  AND (CAST(:tsQuery AS text) IS NULL OR p.search_vector @@ to_tsquery('simple', CAST(:tsQuery AS text)))
					  AND EXISTS (
					      SELECT 1 FROM provider.provider_services s
					      WHERE s.organization_id = p.organization_id
					        AND (CAST(:serviceId AS bigint) IS NULL OR s.service_id = CAST(:serviceId AS bigint))
					        AND (CAST(:atHome AS boolean) IS NULL OR NOT CAST(:atHome AS boolean) OR s.at_home))
					  AND (CAST(:lat AS double precision) IS NULL OR CAST(:radiusKm AS double precision) IS NULL
					       OR (p.latitude IS NOT NULL AND (6371 * 2 * asin(sqrt(power(sin(radians(p.latitude - CAST(:lat AS double precision)) / 2), 2) + cos(radians(CAST(:lat AS double precision))) * cos(radians(p.latitude)) * power(sin(radians(p.longitude - CAST(:lng AS double precision)) / 2), 2)))) <= CAST(:radiusKm AS double precision)))
					""",
			nativeQuery = true)
	Page<ProviderProfile> searchVisibleProfiles(String governorate, String tsQuery, Long serviceId, Boolean atHome,
			Double lat, Double lng, Double radiusKm, Pageable pageable);

}
