package tn.autocare.helpdesk.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tn.autocare.helpdesk.entity.TicketStatus;

/**
 * {@code internal}: a note only agents see. {@code status}: status after a public reply
 * (default WAITING_ON_CUSTOMER).
 */
public record AgentReplyRequest(@NotBlank @Size(max = 10000) String body, boolean internal, TicketStatus status) {
}
