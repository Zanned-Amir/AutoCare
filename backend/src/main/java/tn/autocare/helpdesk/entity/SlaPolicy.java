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

/**
 * Deadlines for one priority, in minutes from ticket creation (waiting on the customer
 * excluded).
 */
@Getter
@Entity
@Table(schema = "helpdesk", name = "sla_policies")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SlaPolicy extends BaseEntity {

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, unique = true, length = 10)
	private TicketPriority priority;

	@Column(name = "first_response_minutes", nullable = false)
	private int firstResponseMinutes;

	@Column(name = "resolution_minutes", nullable = false)
	private int resolutionMinutes;

	@Column(nullable = false)
	private boolean active;

	public void update(int firstResponseMinutes, int resolutionMinutes, boolean active) {
		this.firstResponseMinutes = firstResponseMinutes;
		this.resolutionMinutes = resolutionMinutes;
		this.active = active;
	}

}
