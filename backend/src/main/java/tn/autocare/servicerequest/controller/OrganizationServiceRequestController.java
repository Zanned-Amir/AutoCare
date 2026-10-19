package tn.autocare.servicerequest.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestPermissions;
import tn.autocare.servicerequest.dto.CompleteServiceRequestRequest;
import tn.autocare.servicerequest.dto.OrganizationInsightsResponse;
import tn.autocare.servicerequest.dto.PostRequestMessageRequest;
import tn.autocare.servicerequest.dto.RejectServiceRequestRequest;
import tn.autocare.servicerequest.dto.RequestMessageResponse;
import tn.autocare.servicerequest.dto.SendQuoteRequest;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.service.OrganizationInsightsService;
import tn.autocare.servicerequest.service.ProviderRequestService;
import tn.autocare.servicerequest.service.RequestMessageService;
import tn.autocare.shared.security.CurrentUser;

/** Requests received by a provider organization, handled by its members. */
@Tag(name = "Service requests - Provider")
@RestController
@RequestMapping("/organizations/{organizationId}/service-requests")
@RequiredArgsConstructor
public class OrganizationServiceRequestController {

	private static final String CAN = "@orgPerm.has(#organizationId, '";

	private final ProviderRequestService providerRequestService;

	private final RequestMessageService messageService;

	private final OrganizationInsightsService insightsService;

	@GetMapping
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public PagedModel<ServiceRequestResponse> listOrganizationServiceRequests(@PathVariable Long organizationId,
			@RequestParam(required = false) RequestStatus status,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(
				providerRequestService.listOrganizationServiceRequests(organizationId, status, pageable));
	}

	/** Calendar of the workspace: requests by desired day, every status, oldest first. */
	@GetMapping("/calendar")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public List<ServiceRequestResponse> listOrganizationCalendar(@PathVariable Long organizationId,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return providerRequestService.listOrganizationCalendar(organizationId, from, to);
	}

	/** Dashboard figures over the last {@code weeks} weeks (4 to 26). */
	@GetMapping("/insights")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public OrganizationInsightsResponse getOrganizationInsights(@PathVariable Long organizationId,
			@RequestParam(defaultValue = "12") int weeks) {
		return insightsService.getOrganizationInsights(organizationId, Math.clamp(weeks, 4, 26));
	}

	@GetMapping("/counts")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public Map<RequestStatus, Long> countOrganizationServiceRequests(@PathVariable Long organizationId) {
		return providerRequestService.countOrganizationServiceRequests(organizationId);
	}

	@GetMapping("/{requestId}")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public ServiceRequestResponse getOrganizationServiceRequest(@PathVariable Long organizationId,
			@PathVariable Long requestId) {
		return providerRequestService.getOrganizationServiceRequest(organizationId, requestId);
	}

	@GetMapping("/{requestId}/history")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public List<StatusChangeResponse> listOrganizationServiceRequestHistory(@PathVariable Long organizationId,
			@PathVariable Long requestId) {
		return providerRequestService.listOrganizationServiceRequestHistory(organizationId, requestId);
	}

	@GetMapping("/{requestId}/messages")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public List<RequestMessageResponse> listOrganizationRequestMessages(@PathVariable Long organizationId,
			@PathVariable Long requestId) {
		return messageService.listOrganizationRequestMessages(organizationId, requestId, CurrentUser.id());
	}

	@PostMapping("/{requestId}/messages")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_READ + "')")
	public RequestMessageResponse postOrganizationRequestMessage(@PathVariable Long organizationId,
			@PathVariable Long requestId, @Valid @RequestBody PostRequestMessageRequest request) {
		return messageService.postOrganizationRequestMessage(organizationId, requestId, CurrentUser.id(),
				request.body());
	}

	@PostMapping("/{requestId}/confirm")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_ACCEPT + "')")
	public ServiceRequestResponse confirmServiceRequest(@PathVariable Long organizationId,
			@PathVariable Long requestId) {
		return providerRequestService.confirmServiceRequest(organizationId, requestId, CurrentUser.id());
	}

	@PostMapping("/{requestId}/reject")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_REJECT + "')")
	public ServiceRequestResponse rejectServiceRequest(@PathVariable Long organizationId, @PathVariable Long requestId,
			@Valid @RequestBody RejectServiceRequestRequest request) {
		return providerRequestService.rejectServiceRequest(organizationId, requestId, CurrentUser.id(),
				request.reason());
	}

	@PostMapping("/{requestId}/quote")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_ACCEPT + "')")
	public ServiceRequestResponse sendServiceRequestQuote(@PathVariable Long organizationId,
			@PathVariable Long requestId, @Valid @RequestBody SendQuoteRequest request) {
		return providerRequestService.sendServiceRequestQuote(organizationId, requestId, request);
	}

	@PostMapping("/{requestId}/start")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_UPDATE_STATUS + "')")
	public ServiceRequestResponse startServiceRequest(@PathVariable Long organizationId, @PathVariable Long requestId) {
		return providerRequestService.startServiceRequest(organizationId, requestId, CurrentUser.id());
	}

	@PostMapping("/{requestId}/complete")
	@PreAuthorize(CAN + ServiceRequestPermissions.REQUEST_UPDATE_STATUS + "')")
	public ServiceRequestResponse completeServiceRequest(@PathVariable Long organizationId,
			@PathVariable Long requestId, @Valid @RequestBody CompleteServiceRequestRequest request) {
		return providerRequestService.completeServiceRequest(organizationId, requestId, CurrentUser.id(), request);
	}

}
