package tn.autocare.helpdesk.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.helpdesk.dto.AgentTicketResponse;
import tn.autocare.helpdesk.dto.TicketMessageResponse;
import tn.autocare.helpdesk.dto.TicketResponse;
import tn.autocare.helpdesk.entity.AuthorType;
import tn.autocare.helpdesk.entity.Ticket;
import tn.autocare.helpdesk.entity.TicketEvent;
import tn.autocare.helpdesk.entity.TicketEventType;
import tn.autocare.helpdesk.entity.TicketMessage;
import tn.autocare.helpdesk.repository.TicketEventRepository;
import tn.autocare.helpdesk.repository.TicketRepository;
import tn.autocare.shared.exception.AppException;

/** Shared bits of the customer and agent services: ids, lookups, events, mapping. */
@Component
@RequiredArgsConstructor
class TicketSupport {

	/** No 0/O or 1/I so ids can be read over the phone. */
	private static final char[] ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();

	private static final SecureRandom RANDOM = new SecureRandom();

	private final TicketRepository ticketRepository;

	private final TicketEventRepository eventRepository;

	private final AuthFacade authFacade;

	String newPublicId() {
		String id;
		do {
			StringBuilder builder = new StringBuilder("TK-");
			for (int i = 0; i < 8; i++) {
				builder.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
			}
			id = builder.toString();
		}
		while (ticketRepository.existsByPublicId(id));
		return id;
	}

	Ticket findOrThrow(String publicId) {
		return ticketRepository.findByPublicId(publicId).orElseThrow(() -> AppException.notFound("Ticket", publicId));
	}

	void recordEvent(Ticket ticket, Long actorId, TicketEventType type, Map<String, Object> data) {
		eventRepository.save(TicketEvent.record(ticket.getId(), actorId, type, data));
	}

	Map<Long, UserSummary> users(Collection<Long> ids) {
		List<Long> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
		return distinct.isEmpty() ? Map.of()
				: authFacade.listUsers(distinct)
					.stream()
					.collect(Collectors.toMap(UserSummary::id, Function.identity()));
	}

	List<TicketMessageResponse> toMessages(List<TicketMessage> messages) {
		Map<Long, UserSummary> authors = users(messages.stream().map(TicketMessage::getAuthorId).toList());
		return messages.stream().map(message -> {
			UserSummary author = message.getAuthorId() == null ? null : authors.get(message.getAuthorId());
			// Customers see "Support AutoCare", never the agent's name; agents see who
			// wrote it.
			String name = message.getAuthorType() == AuthorType.SYSTEM ? "AutoCare"
					: author == null ? null : author.fullName();
			return new TicketMessageResponse(message.getId(), message.getAuthorType(), name, message.getBody(),
					message.isInternal(), message.getCreatedAt());
		}).toList();
	}

	static TicketResponse toResponse(Ticket t) {
		return new TicketResponse(t.getPublicId(), t.getSubject(), t.getDescription(), t.getStatus(), t.getPriority(),
				t.getCategory(), t.getOrganizationId(), t.getReferenceType(), t.getReferenceId(), t.getCreatedAt(),
				t.getUpdatedAt(), t.getResolvedAt(), t.getClosedAt());
	}

	AgentTicketResponse toAgentResponse(Ticket t) {
		Map<Long, UserSummary> people = users(java.util.Arrays.asList(t.getCustomerId(), t.getAssigneeId()));
		UserSummary customer = people.get(t.getCustomerId());
		UserSummary assignee = t.getAssigneeId() == null ? null : people.get(t.getAssigneeId());
		return new AgentTicketResponse(t.getPublicId(), t.getSubject(), t.getDescription(), t.getStatus(),
				t.getPriority(), t.getCategory(), t.getChannel(), t.getCustomerId(),
				customer == null ? null : customer.fullName(), customer == null ? null : customer.email(),
				t.getOrganizationId(), t.getAssigneeId(), assignee == null ? null : assignee.fullName(),
				t.getReferenceType(), t.getReferenceId(), t.getEscalationLevel(), t.getFirstResponseDueAt(),
				t.getResolutionDueAt(), t.getSlaPausedAt() != null, t.getFirstResponseBreachedAt(),
				t.getResolutionBreachedAt(), t.getFirstResponseAt(), t.getLastCustomerReplyAt(),
				t.getLastAgentReplyAt(), t.getCreatedAt(), t.getResolvedAt(), t.getClosedAt());
	}

	static Instant now() {
		return Instant.now();
	}

}
