package tn.autocare.servicerequest.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.BookingSchedule;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.dto.SlotResponse;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Bookable times of a provider on a day: its opening ranges cut into slots, minus the
 * places taken by requests still running (pending, confirmed, in progress). Past times of
 * today are left out.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SlotService {

	private static final EnumSet<RequestStatus> HOLDING = EnumSet.of(RequestStatus.PENDING, RequestStatus.CONFIRMED,
			RequestStatus.IN_PROGRESS);

	private final OrganizationFacade organizationFacade;

	private final ServiceRequestRepository requestRepository;

	public List<SlotResponse> listAvailableSlots(Long organizationId, LocalDate date) {
		if (organizationFacade.findOrganization(organizationId)
			.filter(org -> org.status() == OrganizationStatus.APPROVED)
			.isEmpty()) {
			throw AppException.notFound("Provider", organizationId);
		}
		BookingSchedule schedule = organizationFacade.getBookingSchedule(organizationId);
		String day = date.getDayOfWeek().getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toLowerCase(Locale.ROOT);
		String ranges = schedule.effectiveHours().get(day);
		if (ranges == null || ranges.isBlank()) {
			return List.of();
		}
		Map<LocalTime, Long> taken = new HashMap<>();
		for (Object[] row : requestRepository.countBookedSlots(organizationId, date, HOLDING)) {
			taken.put((LocalTime) row[0], (Long) row[1]);
		}
		LocalTime now = date.equals(LocalDate.now(ServiceRequestService.TUNIS))
				? LocalTime.now(ServiceRequestService.TUNIS) : LocalTime.MIN;
		List<SlotResponse> slots = new ArrayList<>();
		for (String range : ranges.split(",")) {
			String[] bounds = range.trim().split("-");
			LocalTime start = LocalTime.parse(bounds[0]);
			LocalTime end = LocalTime.parse(bounds[1]);
			for (LocalTime time = start; !time.plusMinutes(schedule.slotMinutes()).isAfter(end)
					&& time.isAfter(start.minusMinutes(1)); time = time.plusMinutes(schedule.slotMinutes())) {
				if (time.isAfter(now)) {
					int remaining = (int) Math.max(schedule.slotCapacity() - taken.getOrDefault(time, 0L), 0);
					slots.add(new SlotResponse(time, remaining));
				}
			}
		}
		return slots;
	}

	/**
	 * Throws SERVICE_REQUEST_SLOT_UNAVAILABLE when the time is not a free slot of that
	 * day.
	 */
	void checkSlotAvailable(Long organizationId, LocalDate date, LocalTime time) {
		boolean free = listAvailableSlots(organizationId, date).stream()
			.anyMatch(slot -> slot.time().equals(time) && slot.remaining() > 0);
		if (!free) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_SLOT_UNAVAILABLE, "This time is not available");
		}
	}

}
