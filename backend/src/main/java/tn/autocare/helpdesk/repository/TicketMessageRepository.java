package tn.autocare.helpdesk.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.helpdesk.entity.TicketMessage;

public interface TicketMessageRepository extends JpaRepository<TicketMessage, Long> {

	List<TicketMessage> findAllByTicketIdOrderByCreatedAtAsc(Long ticketId);

	List<TicketMessage> findAllByTicketIdAndInternalFalseOrderByCreatedAtAsc(Long ticketId);

}
