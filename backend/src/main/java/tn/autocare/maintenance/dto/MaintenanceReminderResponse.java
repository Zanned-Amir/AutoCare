package tn.autocare.maintenance.dto;

import java.time.Instant;
import java.time.LocalDate;

/** {@code due}: within 7 days or 500 km (or overdue) and not done. */
public record MaintenanceReminderResponse(Long id, Long vehicleId, Long serviceId, String title, LocalDate dueDate,
		Integer dueMileage, String note, boolean due, Instant doneAt, Instant notifiedAt, Instant createdAt) {
}
