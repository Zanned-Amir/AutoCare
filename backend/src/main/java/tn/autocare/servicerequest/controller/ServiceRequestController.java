package tn.autocare.servicerequest.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
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
import tn.autocare.servicerequest.dto.CancelServiceRequestRequest;
import tn.autocare.servicerequest.dto.CreateServiceRequestRequest;
import tn.autocare.servicerequest.dto.PostRequestMessageRequest;
import tn.autocare.servicerequest.dto.RequestMessageResponse;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.service.RequestMessageService;
import tn.autocare.servicerequest.service.ServiceRequestService;
import tn.autocare.shared.security.CurrentUser;

/** The signed-in client's own requests. */
@Tag(name = "Service requests")
@RestController
@RequestMapping("/service-requests")
@RequiredArgsConstructor
public class ServiceRequestController {

	private final ServiceRequestService requestService;

	private final RequestMessageService messageService;

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_CREATE + "')")
	public ServiceRequestResponse createServiceRequest(@Valid @RequestBody CreateServiceRequestRequest request) {
		return requestService.createServiceRequest(CurrentUser.id(), request);
	}

	@GetMapping
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public PagedModel<ServiceRequestResponse> listMyServiceRequests(
			@RequestParam(required = false) RequestStatus status,
			@PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(requestService.listMyServiceRequests(CurrentUser.id(), status, pageable));
	}

	@GetMapping("/{requestId}")
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public ServiceRequestResponse getMyServiceRequest(@PathVariable Long requestId) {
		return requestService.getMyServiceRequest(CurrentUser.id(), requestId);
	}

	@GetMapping("/{requestId}/history")
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public List<StatusChangeResponse> listMyServiceRequestHistory(@PathVariable Long requestId) {
		return requestService.listMyServiceRequestHistory(CurrentUser.id(), requestId);
	}

	@GetMapping("/{requestId}/messages")
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public List<RequestMessageResponse> listMyRequestMessages(@PathVariable Long requestId) {
		return messageService.listMyRequestMessages(CurrentUser.id(), requestId);
	}

	@PostMapping("/{requestId}/messages")
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public RequestMessageResponse postMyRequestMessage(@PathVariable Long requestId,
			@Valid @RequestBody PostRequestMessageRequest request) {
		return messageService.postMyRequestMessage(CurrentUser.id(), requestId, request.body());
	}

	@PostMapping("/{requestId}/quote/accept")
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public ServiceRequestResponse acceptServiceRequestQuote(@PathVariable Long requestId) {
		return requestService.acceptServiceRequestQuote(CurrentUser.id(), requestId);
	}

	@PostMapping("/{requestId}/quote/decline")
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_READ + "')")
	public ServiceRequestResponse declineServiceRequestQuote(@PathVariable Long requestId) {
		return requestService.declineServiceRequestQuote(CurrentUser.id(), requestId);
	}

	@PostMapping("/{requestId}/cancel")
	@PreAuthorize("@perm.has('" + ServiceRequestPermissions.REQUEST_CANCEL + "')")
	public ServiceRequestResponse cancelServiceRequest(@PathVariable Long requestId,
			@Valid @RequestBody(required = false) CancelServiceRequestRequest request) {
		return requestService.cancelServiceRequest(CurrentUser.id(), requestId,
				request == null ? null : request.reason());
	}

}
