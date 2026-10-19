package tn.autocare.helpdesk.service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.helpdesk.entity.Ticket;
import tn.autocare.helpdesk.entity.TicketEventType;
import tn.autocare.helpdesk.entity.TicketStatus;
import tn.autocare.helpdesk.repository.TicketRepository;

/**
 * Every minute (template: helpdesk.cron): flags missed deadlines and closes tickets
 * resolved for more than 7 days. Safe with several instances: tickets are versioned, so a
 * ticket updated twice loses one write instead of logging two breaches.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SlaMonitor {

	static final Duration AUTO_CLOSE_AFTER = Duration.ofDays(7);

	private final TicketRepository ticketRepository;

	private final TicketSupport support;

	@Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
	public void runSlaChecks() {
		try {
			checkSla(Instant.now());
		}
		catch (ObjectOptimisticLockingFailureException ex) {
			log.debug("SLA check raced another writer, retrying next minute");
		}
	}

	@Transactional
	public void checkSla(Instant now) {
		for (Ticket ticket : ticketRepository.findFirstResponseBreaches(now)) {
			if (ticket.markFirstResponseBreached(now)) {
				support.recordEvent(ticket, null, TicketEventType.FIRST_RESPONSE_BREACHED, Map.of());
			}
		}
		for (Ticket ticket : ticketRepository.findResolutionBreaches(now)) {
			if (ticket.markResolutionBreached(now)) {
				support.recordEvent(ticket, null, TicketEventType.RESOLUTION_BREACHED, Map.of());
			}
		}
		for (Ticket ticket : ticketRepository.findAllByStatusAndResolvedAtBefore(TicketStatus.RESOLVED,
				now.minus(AUTO_CLOSE_AFTER))) {
			ticket.moveTo(TicketStatus.CLOSED, now);
			support.recordEvent(ticket, null, TicketEventType.AUTO_CLOSED, Map.of());
		}
	}

}
