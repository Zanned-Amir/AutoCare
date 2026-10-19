package tn.autocare.servicerequest.dto;

import java.time.Instant;

import tn.autocare.servicerequest.api.MessageSide;

/**
 * {@code mine}: written by the reader. {@code authorName} is null for garage staff seen
 * by the client: staff names are not shown to clients.
 */
public record RequestMessageResponse(Long id, MessageSide side, boolean mine, String authorName, String body,
		Instant createdAt) {
}
