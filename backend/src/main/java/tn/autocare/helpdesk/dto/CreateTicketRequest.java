package tn.autocare.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.autocare.helpdesk.entity.TicketCategory;
import tn.autocare.helpdesk.entity.TicketChannel;
import tn.autocare.helpdesk.entity.TicketPriority;

/** Customers may pick LOW, NORMAL or HIGH; URGENT is for agents (escalation). */
public record CreateTicketRequest(@NotBlank @Size(max = 160) String subject,
		@NotBlank @Size(max = 10000) String description, @NotNull TicketCategory category, TicketPriority priority,
		TicketChannel channel, @Size(max = 30) String referenceType, @Size(max = 64) String referenceId) {
}
