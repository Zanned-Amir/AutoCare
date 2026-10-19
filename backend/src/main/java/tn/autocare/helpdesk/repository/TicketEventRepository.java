package tn.autocare.helpdesk.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.helpdesk.entity.TicketEvent;

public interface TicketEventRepository extends JpaRepository<TicketEvent, Long> {

	List<TicketEvent> findAllByTicketIdOrderByCreatedAtAsc(Long ticketId);

}
