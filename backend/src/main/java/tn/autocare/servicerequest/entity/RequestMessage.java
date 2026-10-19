package tn.autocare.servicerequest.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.servicerequest.api.MessageSide;
import tn.autocare.shared.persistence.BaseEntity;

/** One chat message on a request; messages are never edited. */
@Getter
@Entity
@Table(schema = "servicerequest", name = "messages")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RequestMessage extends BaseEntity {

	@Column(name = "service_request_id", nullable = false)
	private Long serviceRequestId;

	@Column(name = "author_id", nullable = false)
	private Long authorId;

	@Enumerated(EnumType.STRING)
	@Column(name = "author_side", nullable = false, length = 10)
	private MessageSide authorSide;

	@Column(nullable = false, length = 2000)
	private String body;

	public static RequestMessage post(Long serviceRequestId, Long authorId, MessageSide side, String body) {
		RequestMessage message = new RequestMessage();
		message.serviceRequestId = serviceRequestId;
		message.authorId = authorId;
		message.authorSide = side;
		message.body = body.trim();
		return message;
	}

}
