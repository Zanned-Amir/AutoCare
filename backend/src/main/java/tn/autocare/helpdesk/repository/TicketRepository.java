package tn.autocare.helpdesk.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.helpdesk.entity.Ticket;
import tn.autocare.helpdesk.entity.TicketStatus;

public interface TicketRepository extends JpaRepository<Ticket, Long>, JpaSpecificationExecutor<Ticket> {

	Optional<Ticket> findByPublicId(String publicId);

	boolean existsByPublicId(String publicId);

	Page<Ticket> findAllByCustomerIdAndOrganizationIdIsNull(Long customerId, Pageable pageable);

	Page<Ticket> findAllByCustomerIdAndOrganizationIdIsNullAndStatus(Long customerId, TicketStatus status,
			Pageable pageable);

	Page<Ticket> findAllByOrganizationId(Long organizationId, Pageable pageable);

	@Query("select t from Ticket t where t.assigneeId is null and t.status in ('OPEN', 'IN_PROGRESS') order by t.firstResponseDueAt asc nulls last, t.createdAt asc")
	List<Ticket> findUnassignedQueue(Pageable pageable);

	@Query("select t from Ticket t where t.firstResponseAt is null and t.firstResponseBreachedAt is null and t.firstResponseDueAt < :now and t.status not in ('RESOLVED', 'CLOSED')")
	List<Ticket> findFirstResponseBreaches(Instant now);

	@Query("select t from Ticket t where t.resolutionBreachedAt is null and t.resolutionDueAt < :now and t.status not in ('RESOLVED', 'CLOSED', 'WAITING_ON_CUSTOMER')")
	List<Ticket> findResolutionBreaches(Instant now);

	List<Ticket> findAllByStatusAndResolvedAtBefore(TicketStatus status, Instant before);

	@Query("select t.status, count(t) from Ticket t group by t.status")
	List<Object[]> countByStatus();

	@Query("select count(t) from Ticket t where t.status not in ('RESOLVED', 'CLOSED') and (t.firstResponseBreachedAt is not null or t.resolutionBreachedAt is not null)")
	long countActiveBreached();

	@Query("select count(t) from Ticket t where t.assigneeId = :agentId and t.status not in ('RESOLVED', 'CLOSED')")
	long countActiveAssignedTo(Long agentId);

}
