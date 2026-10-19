package tn.autocare.helpdesk.dto;

import jakarta.validation.constraints.Size;

public record EscalateTicketRequest(@Size(max = 500) String reason) {
}
