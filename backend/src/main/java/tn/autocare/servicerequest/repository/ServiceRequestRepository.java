package tn.autocare.servicerequest.repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.entity.ServiceRequest;

public interface ServiceRequestRepository
		extends JpaRepository<ServiceRequest, Long>, JpaSpecificationExecutor<ServiceRequest> {

	Page<ServiceRequest> findAllByUserId(Long userId, Pageable pageable);

	Page<ServiceRequest> findAllByUserIdAndStatus(Long userId, RequestStatus status, Pageable pageable);

	Page<ServiceRequest> findAllByOrganizationId(Long organizationId, Pageable pageable);

	Page<ServiceRequest> findAllByOrganizationIdAndStatus(Long organizationId, RequestStatus status, Pageable pageable);

	Optional<ServiceRequest> findByIdAndUserId(Long id, Long userId);

	List<ServiceRequest> findAllByOrganizationIdAndDesiredDateBetweenOrderByDesiredDateAscDesiredTimeAsc(
			Long organizationId, LocalDate from, LocalDate to);

	Optional<ServiceRequest> findByIdAndOrganizationId(Long id, Long organizationId);

	boolean existsByIdAndUserIdAndStatus(Long id, Long userId, RequestStatus status);

	@Query("select r.status, count(r) from ServiceRequest r where r.organizationId = ?1 group by r.status")
	List<Object[]> countByStatus(Long organizationId);

	@Query("select r.status, count(r) from ServiceRequest r group by r.status")
	List<Object[]> countAllByStatus();

	long countByCreatedAtGreaterThanEqual(Instant since);

	List<ServiceRequest> findAllByOrganizationIdAndCreatedAtGreaterThanEqual(Long organizationId, Instant since);

	/** desiredTime, count of requests of that day still holding their slot. */
	@Query("select r.desiredTime, count(r) from ServiceRequest r where r.organizationId = ?1 and r.desiredDate = ?2 "
			+ "and r.desiredTime is not null and r.status in ?3 group by r.desiredTime")
	List<Object[]> countBookedSlots(Long organizationId, LocalDate date, Collection<RequestStatus> statuses);

}
