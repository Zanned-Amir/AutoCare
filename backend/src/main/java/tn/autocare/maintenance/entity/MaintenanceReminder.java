package tn.autocare.maintenance.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

import org.jspecify.annotations.Nullable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

/**
 * A maintenance the client plans: due on a date, at a mileage, or whichever comes first.
 * The client is notified once; changing the due date or mileage arms it again.
 */
@Getter
@Entity
@Table(schema = "maintenance", name = "reminders")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MaintenanceReminder extends BaseEntity {

	/** Notified this many days before the due date. */
	public static final int DAYS_AHEAD = 7;

	/** Notified this many kilometres before the due mileage. */
	public static final int KM_AHEAD = 500;

	@Column(name = "vehicle_id", nullable = false)
	private Long vehicleId;

	@Column(name = "owner_id", nullable = false)
	private Long ownerId;

	@Column(name = "service_id")
	private Long serviceId;

	@Column(nullable = false, length = 120)
	private String title;

	@Column(name = "due_date")
	private LocalDate dueDate;

	@Column(name = "due_mileage")
	private Integer dueMileage;

	@Column(length = 500)
	private String note;

	@Column(name = "done_at")
	private Instant doneAt;

	@Column(name = "notified_at")
	private Instant notifiedAt;

	public static MaintenanceReminder plan(Long vehicleId, Long ownerId, @Nullable Long serviceId, String title,
			@Nullable LocalDate dueDate, @Nullable Integer dueMileage, @Nullable String note) {
		MaintenanceReminder reminder = new MaintenanceReminder();
		reminder.vehicleId = vehicleId;
		reminder.ownerId = ownerId;
		reminder.update(serviceId, title, dueDate, dueMileage, note);
		return reminder;
	}

	public void update(@Nullable Long serviceId, String title, @Nullable LocalDate dueDate,
			@Nullable Integer dueMileage, @Nullable String note) {
		if (!Objects.equals(this.dueDate, dueDate) || !Objects.equals(this.dueMileage, dueMileage)) {
			this.notifiedAt = null;
		}
		this.serviceId = serviceId;
		this.title = title.trim();
		this.dueDate = dueDate;
		this.dueMileage = dueMileage;
		this.note = note == null || note.isBlank() ? null : note.trim();
	}

	public void markDone(Instant now) {
		if (doneAt == null) {
			doneAt = now;
		}
	}

	public void markNotified(Instant now) {
		notifiedAt = now;
	}

	/** Due soon (or overdue) by date or by the vehicle's current mileage. */
	public boolean isDue(LocalDate today, int vehicleMileage) {
		if (doneAt != null) {
			return false;
		}
		boolean byDate = dueDate != null && !dueDate.isAfter(today.plusDays(DAYS_AHEAD));
		boolean byMileage = dueMileage != null && vehicleMileage >= dueMileage - KM_AHEAD;
		return byDate || byMileage;
	}

}
