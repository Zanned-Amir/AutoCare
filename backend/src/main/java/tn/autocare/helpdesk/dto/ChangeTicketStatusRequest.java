package tn.autocare.helpdesk.dto;

import jakarta.validation.constraints.NotNull;
import tn.autocare.helpdesk.entity.TicketStatus;

public record ChangeTicketStatusRequest(@NotNull TicketStatus status) {
}
