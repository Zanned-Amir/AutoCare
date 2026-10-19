package tn.autocare.servicerequest.dto;

import java.time.LocalTime;

/** One bookable time and how many places are left in it (0 = full). */
public record SlotResponse(LocalTime time, int remaining) {
}
