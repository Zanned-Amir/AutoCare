package tn.autocare.helpdesk.service;

import java.time.Instant;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.helpdesk.api.HelpdeskPermissions;
import tn.autocare.helpdesk.dto.AgentReplyRequest;
import tn.autocare.helpdesk.dto.AgentTicketResponse;
import tn.autocare.helpdesk.dto.HelpdeskStatsResponse;
import tn.autocare.helpdesk.dto.TicketEventResponse;
import tn.autocare.helpdesk.dto.TicketMessageResponse;
import tn.autocare.helpdesk.dto.UpdateTicketRequest;
import tn.autocare.helpdesk.entity.AuthorType;
import tn.autocare.helpdesk.entity.Ticket;
import tn.autocare.helpdesk.entity.TicketEventType;
import tn.autocare.helpdesk.entity.TicketMessage;
import tn.autocare.helpdesk.entity.TicketPriority;
import tn.autocare.helpdesk.entity.TicketStatus;
import tn.autocare.helpdesk.repository.SlaPolicyRepository;
import tn.autocare.helpdesk.repository.TicketEventRepository;
import tn.autocare.helpdesk.repository.TicketMessageRepository;
import tn.autocare.helpdesk.repository.TicketRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Agent side (backoffice): queue, assignment, replies and notes, status, priority,
 * escalation.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AgentTicketService {

	private final TicketRepository ticketRepository;

	private final TicketMessageRepository messageRepository;

	private final TicketEventRepository eventRepository;

	private final SlaPolicyRepository slaPolicyRepository;

	private final TicketSupport support;

	private final HelpdeskNotifier notifier;

	private final AuthFacade authFacade;

	/** Unassigned active tickets, the closest first-response deadline first. */
	public List<AgentTicketResponse> listQueue(int size) {
		return ticketRepository.findUnassignedQueue(PageRequest.of(0, size))
			.stream()
			.map(support::toAgentResponse)
			.toList();
	}

	/** {@code assignee}: "me", "unassigned", an agent id, or null for everyone. */
	public Page<AgentTicketResponse> searchTickets(Long agentId, @Nullable TicketStatus status,
			@Nullable TicketPriority priority, @Nullable String assignee, @Nullable String query, Pageable pageable) {
		Specification<Ticket> spec = (root, q, cb) -> cb.conjunction();
		if (status != null) {
			spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), status));
		}
		if (priority != null) {
			spec = spec.and((root, q, cb) -> cb.equal(root.get("priority"), priority));
		}
		if ("me".equals(assignee)) {
			spec = spec.and((root, q, cb) -> cb.equal(root.get("assigneeId"), agentId));
		}
		else if ("unassigned".equals(assignee)) {
			spec = spec.and((root, q, cb) -> cb.isNull(root.get("assigneeId")));
		}
		else if (StringUtils.hasText(assignee) && assignee.chars().allMatch(Character::isDigit)) {
			spec = spec.and((root, q, cb) -> cb.equal(root.get("assigneeId"), Long.valueOf(assignee)));
		}
		if (StringUtils.hasText(query)) {
			String like = "%" + query.trim().toLowerCase() + "%";
			spec = spec.and((root, q, cb) -> cb.or(cb.like(cb.lower(root.get("subject")), like),
					cb.like(cb.lower(root.get("publicId")), like)));
		}
		return ticketRepository.findAll(spec, pageable).map(support::toAgentResponse);
	}

	public AgentTicketResponse getTicket(String publicId) {
		return support.toAgentResponse(support.findOrThrow(publicId));
	}

	public List<TicketMessageResponse> listTicketMessages(String publicId) {
		return support
			.toMessages(messageRepository.findAllByTicketIdOrderByCreatedAtAsc(support.findOrThrow(publicId).getId()));
	}

	public List<TicketEventResponse> listTicketEvents(String publicId) {
		return eventRepository.findAllByTicketIdOrderByCreatedAtAsc(support.findOrThrow(publicId).getId())
			.stream()
			.map(e -> new TicketEventResponse(e.getType(), e.getActorId(), e.getData(), e.getCreatedAt()))
			.toList();
	}

	@Transactional
	public AgentTicketResponse assignTicket(Long actorId, String publicId, @Nullable Long agentId) {
		if (agentId != null && !authFacade.hasPlatformPermission(agentId, HelpdeskPermissions.TICKET_MANAGE)) {
			throw new AppException(ErrorCode.TICKET_ASSIGNEE_INVALID, "Not a support agent");
		}
		Ticket ticket = support.findOrThrow(publicId);
		ticket.assignTo(agentId);
		Map<String, Object> data = new HashMap<>();
		data.put("agentId", agentId);
		support.recordEvent(ticket, actorId, agentId == null ? TicketEventType.UNASSIGNED : TicketEventType.ASSIGNED,
				data);
		return support.toAgentResponse(ticket);
	}

	/**
	 * A public reply e-mails the customer and, by default, waits for their answer (SLA
	 * paused).
	 */
	@Transactional
	public TicketMessageResponse replyAsAgent(Long agentId, String publicId, AgentReplyRequest request) {
		Ticket ticket = support.findOrThrow(publicId);
		if (!request.internal()) {
			TicketStatus before = ticket.getStatus();
			TicketStatus after = request.status() == null ? TicketStatus.WAITING_ON_CUSTOMER : request.status();
			ticket.recordAgentReply(Instant.now(), after);
			if (before != after) {
				support.recordEvent(ticket, agentId, TicketEventType.STATUS_CHANGED,
						Map.of("from", before.name(), "to", after.name()));
			}
		}
		TicketMessage message = messageRepository
			.save(TicketMessage.write(ticket.getId(), agentId, AuthorType.AGENT, request.body(), request.internal()));
		if (!request.internal()) {
			if (ticket.getStatus() == TicketStatus.RESOLVED) {
				notifier.notifyResolved(ticket);
			}
			else {
				notifier.notifyAgentReply(ticket, request.body());
			}
		}
		return support.toMessages(List.of(message)).getFirst();
	}

	@Transactional
	public AgentTicketResponse changeTicketStatus(Long agentId, String publicId, TicketStatus status) {
		Ticket ticket = support.findOrThrow(publicId);
		TicketStatus before = ticket.getStatus();
		ticket.moveTo(status, Instant.now());
		support.recordEvent(ticket, agentId, TicketEventType.STATUS_CHANGED,
				Map.of("from", before.name(), "to", status.name()));
		if (status == TicketStatus.RESOLVED && before != TicketStatus.RESOLVED) {
			notifier.notifyResolved(ticket);
		}
		return support.toAgentResponse(ticket);
	}

	@Transactional
	public AgentTicketResponse updateTicket(Long agentId, String publicId, UpdateTicketRequest request) {
		Ticket ticket = support.findOrThrow(publicId);
		if (request.priority() != null && request.priority() != ticket.getPriority()) {
			String before = ticket.getPriority().name();
			ticket.changePriority(request.priority(),
					slaPolicyRepository.findByPriority(request.priority()).orElse(null));
			support.recordEvent(ticket, agentId, TicketEventType.PRIORITY_CHANGED,
					Map.of("from", before, "to", request.priority().name()));
		}
		if (request.category() != null && request.category() != ticket.getCategory()) {
			String before = ticket.getCategory().name();
			ticket.changeCategory(request.category());
			support.recordEvent(ticket, agentId, TicketEventType.CATEGORY_CHANGED,
					Map.of("from", before, "to", request.category().name()));
		}
		return support.toAgentResponse(ticket);
	}

	/** One level up, and the priority goes up with it (tighter SLA). */
	@Transactional
	public AgentTicketResponse escalateTicket(Long agentId, String publicId, @Nullable String reason) {
		Ticket ticket = support.findOrThrow(publicId);
		ticket.escalate(slaPolicyRepository.findByPriority(ticket.getPriority().raised()).orElse(null));
		Map<String, Object> data = new HashMap<>();
		data.put("level", ticket.getEscalationLevel());
		data.put("priority", ticket.getPriority().name());
		data.put("reason", reason);
		support.recordEvent(ticket, agentId, TicketEventType.ESCALATED, data);
		return support.toAgentResponse(ticket);
	}

	public HelpdeskStatsResponse getHelpdeskStats(Long agentId) {
		Map<TicketStatus, Long> byStatus = new EnumMap<>(TicketStatus.class);
		for (TicketStatus status : TicketStatus.values()) {
			byStatus.put(status, 0L);
		}
		for (Object[] row : ticketRepository.countByStatus()) {
			byStatus.put((TicketStatus) row[0], (Long) row[1]);
		}
		long unassigned = ticketRepository.findUnassignedQueue(PageRequest.of(0, 1000)).size();
		return new HelpdeskStatsResponse(byStatus, unassigned, ticketRepository.countActiveBreached(),
				ticketRepository.countActiveAssignedTo(agentId));
	}

}
