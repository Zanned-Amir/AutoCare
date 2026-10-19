package tn.autocare.helpdesk.entity;

import java.util.HashMap;
import java.util.Map;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/** The ticket's timeline: who changed what, never edited. */
@Getter
@Entity
@Table(schema = "helpdesk", name = "ticket_events")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TicketEvent extends BaseEntity {

	@Column(name = "ticket_id", nullable = false)
	private Long ticketId;

	/** Null for the system (SLA job). */
	@Column(name = "actor_id")
	private Long actorId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private TicketEventType type;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(nullable = false, columnDefinition = "jsonb")
	private Map<String, Object> data = new HashMap<>();

	public static TicketEvent record(Long ticketId, Long actorId, TicketEventType type, Map<String, Object> data) {
		TicketEvent event = new TicketEvent();
		event.ticketId = ticketId;
		event.actorId = actorId;
		event.type = type;
		event.data = new HashMap<>(data);
		return event;
	}

}
