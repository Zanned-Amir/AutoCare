package tn.autocare.helpdesk.dto;

import java.time.Instant;

import tn.autocare.helpdesk.entity.AuthorType;

public record TicketMessageResponse(Long id, AuthorType authorType, String authorName, String body, boolean internal,
		Instant createdAt) {
}
