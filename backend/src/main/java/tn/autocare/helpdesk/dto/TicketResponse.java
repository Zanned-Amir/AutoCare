package tn.autocare.helpdesk.dto;

import java.time.Instant;

import tn.autocare.helpdesk.entity.TicketCategory;
import tn.autocare.helpdesk.entity.TicketPriority;
import tn.autocare.helpdesk.entity.TicketStatus;

/** What customers see. */
public record TicketResponse(String publicId, String subject, String description, TicketStatus status,
		TicketPriority priority, TicketCategory category, Long organizationId, String referenceType, String referenceId,
		Instant createdAt, Instant updatedAt, Instant resolvedAt, Instant closedAt) {
}
