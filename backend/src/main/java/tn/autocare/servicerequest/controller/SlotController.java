package tn.autocare.servicerequest.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.servicerequest.dto.SlotResponse;
import tn.autocare.servicerequest.service.SlotService;

/** Public: the times a client can book with a provider on a day. */
@Tag(name = "Service requests")
@RestController
@RequiredArgsConstructor
public class SlotController {

	private final SlotService slotService;

	@GetMapping("/providers/{organizationId}/slots")
	public List<SlotResponse> listAvailableSlots(@PathVariable Long organizationId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return slotService.listAvailableSlots(organizationId, date);
	}

}
