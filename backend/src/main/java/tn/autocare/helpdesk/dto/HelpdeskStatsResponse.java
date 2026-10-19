package tn.autocare.helpdesk.dto;

import java.util.Map;

import tn.autocare.helpdesk.entity.TicketStatus;

public record HelpdeskStatsResponse(Map<TicketStatus, Long> byStatus, long unassigned, long activeBreached,
		long assignedToMe) {
}
