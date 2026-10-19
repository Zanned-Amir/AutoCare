package tn.autocare.review.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "review", name = "reviews")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review extends BaseEntity {

	@Column(name = "service_request_id", nullable = false, unique = true)
	private Long serviceRequestId;

	@Column(name = "organization_id", nullable = false)
	private Long organizationId;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(nullable = false)
	private short rating;

	@Column(length = 1000)
	private String comment;

	@Column(length = 1000)
	private String reply;

	@Column(name = "replied_at")
	private Instant repliedAt;

	public static Review write(Long serviceRequestId, Long organizationId, Long userId, int rating, String comment) {
		Review review = new Review();
		review.serviceRequestId = serviceRequestId;
		review.organizationId = organizationId;
		review.userId = userId;
		review.rating = (short) rating;
		review.comment = blankToNull(comment);
		return review;
	}

	/** The provider answers once; a new answer replaces the previous one. */
	public void reply(String text, Instant now) {
		this.reply = blankToNull(text);
		this.repliedAt = this.reply == null ? null : now;
	}

	private static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
