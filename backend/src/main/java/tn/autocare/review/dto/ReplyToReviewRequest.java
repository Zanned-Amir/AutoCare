package tn.autocare.review.dto;

import jakarta.validation.constraints.Size;

/** An empty reply removes the previous one. */
public record ReplyToReviewRequest(@Size(max = 1000) String reply) {
}
