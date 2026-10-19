package tn.autocare.organization.api;

import java.util.Map;

/**
 * When an organization takes appointments. {@code workingHours}: day key ("mon".."sun")
 * to ranges "08:00-12:00,14:00-18:00"; a missing day is closed, an empty map means Monday
 * to Saturday 08:00-18:00.
 */
public record BookingSchedule(Map<String, String> workingHours, int slotMinutes, int slotCapacity) {

	public static final Map<String, String> DEFAULT_HOURS = Map.of("mon", "08:00-18:00", "tue", "08:00-18:00", "wed",
			"08:00-18:00", "thu", "08:00-18:00", "fri", "08:00-18:00", "sat", "08:00-18:00");

	public Map<String, String> effectiveHours() {
		return workingHours == null || workingHours.isEmpty() ? DEFAULT_HOURS : workingHours;
	}

}
