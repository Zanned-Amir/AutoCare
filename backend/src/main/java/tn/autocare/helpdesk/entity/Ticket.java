package tn.autocare.helpdesk.entity;

import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * A support request. SLA: first-response and resolution deadlines come from the policy of
 * its priority; time spent WAITING_ON_CUSTOMER is added back to the resolution deadline.
 */
@Getter
@Entity
@Table(schema = "helpdesk", name = "tickets")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Ticket extends BaseEntity {

	private static final Set<TicketStatus> DONE = EnumSet.of(TicketStatus.RESOLVED, TicketStatus.CLOSED);

	/**
	 * Two agents (or the SLA job) changing the same ticket at once: the second write
	 * fails.
	 */
	@Version
	private long version;

	/** Shown to customers and used in URLs: "TK-7K3M9QX2". */
	@Column(name = "public_id", nullable = false, unique = true, length = 16)
	private String publicId;

	@Column(nullable = false, length = 160)
	private String subject;

	@Column(nullable = false, columnDefinition = "text")
	private String description;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 25)
	private TicketStatus status;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private TicketPriority priority;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private TicketCategory category;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private TicketChannel channel;

	/** User ids and organization id from other modules. */
	@Column(name = "customer_id", nullable = false)
	private Long customerId;

	@Column(name = "organization_id")
	private Long organizationId;

	@Column(name = "assignee_id")
	private Long assigneeId;

	/** What the ticket is about, e.g. SERVICE_REQUEST 42. */
	@Column(name = "reference_type", length = 30)
	private String referenceType;

	@Column(name = "reference_id", length = 64)
	private String referenceId;

	@Column(name = "escalation_level", nullable = false)
	private int escalationLevel;

	@Column(name = "first_response_due_at")
	private Instant firstResponseDueAt;

	@Column(name = "resolution_due_at")
	private Instant resolutionDueAt;

	@Column(name = "sla_paused_at")
	private Instant slaPausedAt;

	@Column(name = "paused_seconds", nullable = false)
	private long pausedSeconds;

	@Column(name = "first_response_breached_at")
	private Instant firstResponseBreachedAt;

	@Column(name = "resolution_breached_at")
	private Instant resolutionBreachedAt;

	@Column(name = "first_response_at")
	private Instant firstResponseAt;

	@Column(name = "last_customer_reply_at")
	private Instant lastCustomerReplyAt;

	@Column(name = "last_agent_reply_at")
	private Instant lastAgentReplyAt;

	@Column(name = "resolved_at")
	private Instant resolvedAt;

	@Column(name = "closed_at")
	private Instant closedAt;

	public static Ticket open(String publicId, Long customerId, Long organizationId, String subject, String description,
			TicketCategory category, TicketPriority priority, TicketChannel channel, String referenceType,
			String referenceId) {
		Ticket ticket = new Ticket();
		ticket.publicId = publicId;
		ticket.customerId = customerId;
		ticket.organizationId = organizationId;
		ticket.subject = subject.trim();
		ticket.description = description.trim();
		ticket.category = category;
		ticket.priority = priority;
		ticket.channel = channel;
		ticket.referenceType = referenceType;
		ticket.referenceId = referenceId;
		ticket.status = TicketStatus.OPEN;
		ticket.lastCustomerReplyAt = Instant.now();
		return ticket;
	}

	/**
	 * Sets both deadlines from the creation time; called at creation and when the
	 * priority changes.
	 */
	public void applySla(SlaPolicy policy, Instant createdAt) {
		if (policy == null || !policy.isActive()) {
			firstResponseDueAt = null;
			resolutionDueAt = null;
			return;
		}
		if (firstResponseAt == null) {
			firstResponseDueAt = createdAt.plus(Duration.ofMinutes(policy.getFirstResponseMinutes()));
		}
		resolutionDueAt = createdAt.plus(Duration.ofMinutes(policy.getResolutionMinutes())).plusSeconds(pausedSeconds);
	}

	public void recordCustomerReply(Instant now) {
		checkNotClosed();
		lastCustomerReplyAt = now;
		if (status == TicketStatus.WAITING_ON_CUSTOMER || status == TicketStatus.RESOLVED) {
			moveTo(assigneeId == null ? TicketStatus.OPEN : TicketStatus.IN_PROGRESS, now);
		}
	}

	public void recordAgentReply(Instant now, TicketStatus newStatus) {
		checkNotClosed();
		if (firstResponseAt == null) {
			firstResponseAt = now;
		}
		lastAgentReplyAt = now;
		moveTo(newStatus, now);
	}

	public void moveTo(TicketStatus newStatus, Instant now) {
		checkNotClosed();
		if (newStatus == status) {
			return;
		}
		if (status == TicketStatus.WAITING_ON_CUSTOMER && slaPausedAt != null) {
			long paused = Duration.between(slaPausedAt, now).toSeconds();
			pausedSeconds += paused;
			if (resolutionDueAt != null) {
				resolutionDueAt = resolutionDueAt.plusSeconds(paused);
			}
			slaPausedAt = null;
		}
		if (newStatus == TicketStatus.WAITING_ON_CUSTOMER) {
			slaPausedAt = now;
		}
		if (newStatus == TicketStatus.RESOLVED) {
			resolvedAt = now;
		}
		else if (newStatus == TicketStatus.CLOSED) {
			closedAt = now;
		}
		else {
			resolvedAt = null;
		}
		status = newStatus;
	}

	public void assignTo(Long agentId) {
		checkNotClosed();
		assigneeId = agentId;
		if (status == TicketStatus.OPEN && agentId != null) {
			status = TicketStatus.IN_PROGRESS;
		}
		if (agentId == null && status == TicketStatus.IN_PROGRESS) {
			status = TicketStatus.OPEN;
		}
	}

	public void changePriority(TicketPriority newPriority, SlaPolicy policy) {
		checkNotClosed();
		priority = newPriority;
		applySla(policy, getCreatedAt());
	}

	public void changeCategory(TicketCategory newCategory) {
		category = newCategory;
	}

	public void escalate(SlaPolicy raisedPolicy) {
		checkNotClosed();
		escalationLevel++;
		changePriority(priority.raised(), raisedPolicy);
	}

	public boolean markFirstResponseBreached(Instant now) {
		if (firstResponseBreachedAt != null || firstResponseAt != null || DONE.contains(status)) {
			return false;
		}
		firstResponseBreachedAt = now;
		return true;
	}

	public boolean markResolutionBreached(Instant now) {
		if (resolutionBreachedAt != null || DONE.contains(status) || status == TicketStatus.WAITING_ON_CUSTOMER) {
			return false;
		}
		resolutionBreachedAt = now;
		return true;
	}

	public boolean isDone() {
		return DONE.contains(status);
	}

	private void checkNotClosed() {
		if (status == TicketStatus.CLOSED) {
			throw new AppException(ErrorCode.TICKET_CLOSED, "This ticket is closed");
		}
	}

}
