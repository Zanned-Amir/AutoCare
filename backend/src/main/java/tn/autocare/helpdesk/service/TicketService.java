package tn.autocare.helpdesk.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.helpdesk.dto.CreateTicketRequest;
import tn.autocare.helpdesk.dto.TicketMessageResponse;
import tn.autocare.helpdesk.dto.TicketResponse;
import tn.autocare.helpdesk.entity.AuthorType;
import tn.autocare.helpdesk.entity.Ticket;
import tn.autocare.helpdesk.entity.TicketChannel;
import tn.autocare.helpdesk.entity.TicketEventType;
import tn.autocare.helpdesk.entity.TicketMessage;
import tn.autocare.helpdesk.entity.TicketPriority;
import tn.autocare.helpdesk.entity.TicketStatus;
import tn.autocare.helpdesk.repository.SlaPolicyRepository;
import tn.autocare.helpdesk.repository.TicketMessageRepository;
import tn.autocare.helpdesk.repository.TicketRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Customer side: a user's own tickets, or an organization's tickets for its members.
 * Someone else's ticket answers 404.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketService {

	private final TicketRepository ticketRepository;

	private final TicketMessageRepository messageRepository;

	private final SlaPolicyRepository slaPolicyRepository;

	private final TicketSupport support;

	@Transactional
	public TicketResponse createTicket(Long customerId, @Nullable Long organizationId, CreateTicketRequest request) {
		TicketPriority priority = request.priority() == null ? TicketPriority.NORMAL : request.priority();
		if (priority == TicketPriority.URGENT) {
			throw new AppException(ErrorCode.TICKET_PRIORITY_NOT_ALLOWED, "Only support sets URGENT");
		}
		Ticket ticket = Ticket.open(support.newPublicId(), customerId, organizationId, request.subject(),
				request.description(), request.category(), priority,
				request.channel() == null ? TicketChannel.WEB : request.channel(), request.referenceType(),
				request.referenceId());
		ticket = ticketRepository.saveAndFlush(ticket);
		ticket.applySla(slaPolicyRepository.findByPriority(priority).orElse(null), ticket.getCreatedAt());
		support.recordEvent(ticket, customerId, TicketEventType.CREATED, Map.of("priority", priority.name()));
		return TicketSupport.toResponse(ticket);
	}

	public Page<TicketResponse> listMyTickets(Long customerId, @Nullable TicketStatus status, Pageable pageable) {
		Page<Ticket> page = status == null
				? ticketRepository.findAllByCustomerIdAndOrganizationIdIsNull(customerId, pageable)
				: ticketRepository.findAllByCustomerIdAndOrganizationIdIsNullAndStatus(customerId, status, pageable);
		return page.map(TicketSupport::toResponse);
	}

	public Page<TicketResponse> listOrganizationTickets(Long organizationId, Pageable pageable) {
		return ticketRepository.findAllByOrganizationId(organizationId, pageable).map(TicketSupport::toResponse);
	}

	public TicketResponse getTicket(TicketOwner owner, String publicId) {
		return TicketSupport.toResponse(findVisible(owner, publicId));
	}

	public List<TicketMessageResponse> listTicketMessages(TicketOwner owner, String publicId) {
		Ticket ticket = findVisible(owner, publicId);
		return support
			.toMessages(messageRepository.findAllByTicketIdAndInternalFalseOrderByCreatedAtAsc(ticket.getId()));
	}

	/** A reply on a resolved ticket reopens it; on a closed one it is refused. */
	@Transactional
	public TicketMessageResponse replyToTicket(TicketOwner owner, String publicId, String body) {
		Ticket ticket = findVisible(owner, publicId);
		TicketStatus before = ticket.getStatus();
		ticket.recordCustomerReply(Instant.now());
		if (before == TicketStatus.RESOLVED) {
			support.recordEvent(ticket, owner.userId(), TicketEventType.REOPENED, Map.of());
		}
		TicketMessage message = messageRepository
			.save(TicketMessage.write(ticket.getId(), owner.userId(), AuthorType.CUSTOMER, body, false));
		return support.toMessages(List.of(message)).getFirst();
	}

	@Transactional
	public TicketResponse closeTicket(TicketOwner owner, String publicId) {
		Ticket ticket = findVisible(owner, publicId);
		changeStatus(ticket, owner.userId(), TicketStatus.CLOSED);
		return TicketSupport.toResponse(ticket);
	}

	@Transactional
	public TicketResponse reopenTicket(TicketOwner owner, String publicId) {
		Ticket ticket = findVisible(owner, publicId);
		if (ticket.getStatus() != TicketStatus.RESOLVED) {
			throw new AppException(ErrorCode.TICKET_STATUS_INVALID, "Only a resolved ticket can be reopened");
		}
		changeStatus(ticket, owner.userId(),
				ticket.getAssigneeId() == null ? TicketStatus.OPEN : TicketStatus.IN_PROGRESS);
		support.recordEvent(ticket, owner.userId(), TicketEventType.REOPENED, Map.of());
		return TicketSupport.toResponse(ticket);
	}

	private void changeStatus(Ticket ticket, Long actorId, TicketStatus status) {
		TicketStatus before = ticket.getStatus();
		ticket.moveTo(status, Instant.now());
		support.recordEvent(ticket, actorId, TicketEventType.STATUS_CHANGED,
				Map.of("from", before.name(), "to", status.name()));
	}

	private Ticket findVisible(TicketOwner owner, String publicId) {
		Ticket ticket = support.findOrThrow(publicId);
		boolean visible = owner.organizationId() == null
				? ticket.getOrganizationId() == null && ticket.getCustomerId().equals(owner.userId())
				: owner.organizationId().equals(ticket.getOrganizationId());
		if (!visible) {
			throw AppException.notFound("Ticket", publicId);
		}
		return ticket;
	}

	/**
	 * Who is asking: a user for their own tickets, or a member for an organization's
	 * tickets.
	 */
	public record TicketOwner(Long userId, @Nullable Long organizationId) {

		public static TicketOwner user(Long userId) {
			return new TicketOwner(userId, null);
		}

		public static TicketOwner organization(Long userId, Long organizationId) {
			return new TicketOwner(userId, organizationId);
		}

	}

}
