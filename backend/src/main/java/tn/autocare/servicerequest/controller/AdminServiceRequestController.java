package tn.autocare.servicerequest.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestPermissions;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.ServiceRequestStatsResponse;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.service.AdminServiceRequestService;

/** Every request on the platform, for the backoffice (read only). */
@Tag(name = "Admin - Service requests")
@RestController
@RequestMapping("/admin/service-requests")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
public class AdminServiceRequestController {

	private final AdminServiceRequestService adminRequestService;

	@GetMapping
	public PagedModel<ServiceRequestResponse> searchServiceRequests(
			@RequestParam(required = false) RequestStatus status, @RequestParam(required = false) List<Long> serviceIds,
			@RequestParam(required = false) Long organizationId, @RequestParam(required = false) Long userId,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(adminRequestService.searchServiceRequests(status, serviceIds, organizationId, userId,
				from, to, pageable));
	}

	@GetMapping("/stats")
	public ServiceRequestStatsResponse getServiceRequestStats() {
		return adminRequestService.getServiceRequestStats();
	}

	@GetMapping("/{requestId}")
	public ServiceRequestResponse getServiceRequest(@PathVariable Long requestId) {
		return adminRequestService.getServiceRequest(requestId);
	}

	@GetMapping("/{requestId}/history")
	public List<StatusChangeResponse> listServiceRequestHistory(@PathVariable Long requestId) {
		return adminRequestService.listServiceRequestHistory(requestId);
	}

}
