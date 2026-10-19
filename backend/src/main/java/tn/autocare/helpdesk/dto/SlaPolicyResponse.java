package tn.autocare.helpdesk.dto;

import tn.autocare.helpdesk.entity.TicketPriority;

public record SlaPolicyResponse(TicketPriority priority, int firstResponseMinutes, int resolutionMinutes,
		boolean active) {
}
