package tn.autocare.helpdesk.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.helpdesk.entity.SlaPolicy;
import tn.autocare.helpdesk.entity.TicketPriority;

public interface SlaPolicyRepository extends JpaRepository<SlaPolicy, Long> {

	Optional<SlaPolicy> findByPriority(TicketPriority priority);

	List<SlaPolicy> findAllByOrderByIdAsc();

}
