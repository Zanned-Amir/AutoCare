package tn.autocare.review.dto;

import java.time.Instant;

/**
 * {@code authorName}: first name and initial ("Sami B."), never the full name or e-mail.
 */
public record ReviewResponse(Long id, Long serviceRequestId, int rating, String comment, String authorName,
		String reply, Instant repliedAt, Instant createdAt) {
}
