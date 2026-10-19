package tn.autocare.helpdesk.dto;

import java.time.Instant;
import java.util.Map;

import tn.autocare.helpdesk.entity.TicketEventType;

public record TicketEventResponse(TicketEventType type, Long actorId, Map<String, Object> data, Instant createdAt) {
}
