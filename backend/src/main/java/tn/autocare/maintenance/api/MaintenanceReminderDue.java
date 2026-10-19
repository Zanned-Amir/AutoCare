package tn.autocare.maintenance.api;

import java.time.LocalDate;

/** A planned maintenance is due soon: its owner is told. */
public record MaintenanceReminderDue(Long reminderId, Long ownerId, Long vehicleId, String title, LocalDate dueDate,
		Integer dueMileage) {
}
