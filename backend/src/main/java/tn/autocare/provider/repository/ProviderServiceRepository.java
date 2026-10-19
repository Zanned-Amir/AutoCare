package tn.autocare.provider.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.provider.entity.ProviderService;

public interface ProviderServiceRepository extends JpaRepository<ProviderService, Long> {

	List<ProviderService> findAllByOrganizationIdOrderByIdAsc(Long organizationId);

	List<ProviderService> findAllByOrganizationIdIn(Collection<Long> organizationIds);

	Optional<ProviderService> findByIdAndOrganizationId(Long id, Long organizationId);

	Optional<ProviderService> findByOrganizationIdAndServiceId(Long organizationId, Long serviceId);

	boolean existsByOrganizationIdAndServiceId(Long organizationId, Long serviceId);

	@Query("select s.serviceId, count(distinct s.organizationId) from ProviderService s group by s.serviceId")
	List<Object[]> countProvidersByService();

}
