package tn.autocare.helpdesk.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/** A reply in a ticket. {@code internal} notes are only visible to agents. */
@Getter
@Entity
@Table(schema = "helpdesk", name = "ticket_messages")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TicketMessage extends BaseEntity {

	@Column(name = "ticket_id", nullable = false)
	private Long ticketId;

	@Column(name = "author_id")
	private Long authorId;

	@Enumerated(EnumType.STRING)
	@Column(name = "author_type", nullable = false, length = 10)
	private AuthorType authorType;

	@Column(nullable = false, columnDefinition = "text")
	private String body;

	@Column(nullable = false)
	private boolean internal;

	public static TicketMessage write(Long ticketId, Long authorId, AuthorType authorType, String body,
			boolean internal) {
		TicketMessage message = new TicketMessage();
		message.ticketId = ticketId;
		message.authorId = authorId;
		message.authorType = authorType;
		message.body = body.trim();
		message.internal = internal;
		return message;
	}

}
