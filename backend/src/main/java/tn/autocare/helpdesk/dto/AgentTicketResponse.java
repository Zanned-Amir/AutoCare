package tn.autocare.helpdesk.dto;

import java.time.Instant;

import tn.autocare.helpdesk.entity.TicketCategory;
import tn.autocare.helpdesk.entity.TicketChannel;
import tn.autocare.helpdesk.entity.TicketPriority;
import tn.autocare.helpdesk.entity.TicketStatus;

/** What agents see: the customer, assignment and SLA state. */
public record AgentTicketResponse(String publicId, String subject, String description, TicketStatus status,
		TicketPriority priority, TicketCategory category, TicketChannel channel, Long customerId, String customerName,
		String customerEmail, Long organizationId, Long assigneeId, String assigneeName, String referenceType,
		String referenceId, int escalationLevel, Instant firstResponseDueAt, Instant resolutionDueAt, boolean slaPaused,
		Instant firstResponseBreachedAt, Instant resolutionBreachedAt, Instant firstResponseAt,
		Instant lastCustomerReplyAt, Instant lastAgentReplyAt, Instant createdAt, Instant resolvedAt,
		Instant closedAt) {
}
