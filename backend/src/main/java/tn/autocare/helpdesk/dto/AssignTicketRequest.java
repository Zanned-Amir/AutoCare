package tn.autocare.helpdesk.dto;

import jakarta.validation.constraints.NotNull;

public record AssignTicketRequest(@NotNull Long agentId) {
}
