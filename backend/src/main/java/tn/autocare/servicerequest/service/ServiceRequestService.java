package tn.autocare.servicerequest.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.diagnostic.api.DiagnosticFacade;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.api.OrganizationType;
import tn.autocare.provider.api.ProviderFacade;
import tn.autocare.servicerequest.api.LocationType;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestCreated;
import tn.autocare.servicerequest.api.ServiceRequestStatusChanged;
import tn.autocare.servicerequest.dto.CreateServiceRequestRequest;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.entity.ServiceRequest;
import tn.autocare.servicerequest.entity.StatusChange;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;
import tn.autocare.servicerequest.repository.StatusChangeRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.vehicle.api.VehicleFacade;

/** The client's side: send, follow and cancel their own requests. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ServiceRequestService {

	static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

	private static final int MAX_DAYS_AHEAD = 90;

	private final ServiceRequestRepository requestRepository;

	private final StatusChangeRepository historyRepository;

	private final ServiceRequestViews views;

	private final VehicleFacade vehicleFacade;

	private final OrganizationFacade organizationFacade;

	private final ProviderFacade providerFacade;

	private final DiagnosticFacade diagnosticFacade;

	private final ApplicationEventPublisher events;

	private final SlotService slotService;

	@Transactional
	public ServiceRequestResponse createServiceRequest(Long userId, CreateServiceRequestRequest request) {
		if (!vehicleFacade.isVehicleOwnedBy(request.vehicleId(), userId)) {
			throw AppException.notFound("Vehicle", request.vehicleId());
		}
		boolean providerOpen = organizationFacade.findOrganization(request.organizationId())
			.filter(org -> org.type() == OrganizationType.PROVIDER && org.status() == OrganizationStatus.APPROVED)
			.isPresent();
		if (!providerOpen) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_PROVIDER_UNAVAILABLE, "Provider not approved");
		}
		boolean atHome = request.locationType() == LocationType.HOME;
		if (!providerFacade.isServiceOffered(request.organizationId(), request.serviceId(), atHome)) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_SERVICE_NOT_OFFERED, "Service not offered there");
		}
		LocalDate today = LocalDate.now(TUNIS);
		if (request.desiredDate().isBefore(today) || request.desiredDate().isAfter(today.plusDays(MAX_DAYS_AHEAD))) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_DATE_INVALID, "Date out of range");
		}
		if (request.desiredTime() != null) {
			slotService.checkSlotAvailable(request.organizationId(), request.desiredDate(), request.desiredTime());
		}
		if (atHome && (request.location() == null || request.location().isBlank())) {
			throw new AppException(ErrorCode.SERVICE_REQUEST_LOCATION_REQUIRED, "Address required for home service");
		}
		if (request.diagnosticId() != null && diagnosticFacade.findDiagnostic(request.diagnosticId())
			.filter(diagnostic -> diagnostic.userId().equals(userId))
			.isEmpty()) {
			throw AppException.notFound("Diagnostic", request.diagnosticId());
		}

		ServiceRequest saved = requestRepository.save(ServiceRequest.submit(userId, request.vehicleId(),
				request.serviceId(), request.organizationId(), request.diagnosticId(), request.desiredDate(),
				request.desiredTime(), request.locationType(), atHome ? request.location() : null, request.note()));
		historyRepository.save(StatusChange.record(saved.getId(), null, RequestStatus.PENDING, userId, null));
		events.publishEvent(
				new ServiceRequestCreated(saved.getId(), saved.getOrganizationId(), userId, saved.getServiceId()));
		return views.toResponse(saved, false);
	}

	public Page<ServiceRequestResponse> listMyServiceRequests(Long userId, @Nullable RequestStatus status,
			Pageable pageable) {
		Page<ServiceRequest> page = status == null ? requestRepository.findAllByUserId(userId, pageable)
				: requestRepository.findAllByUserIdAndStatus(userId, status, pageable);
		List<ServiceRequestResponse> content = views.toResponses(page.getContent(), false);
		return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
	}

	public ServiceRequestResponse getMyServiceRequest(Long userId, Long requestId) {
		return views.toResponse(findMine(userId, requestId), false);
	}

	public List<StatusChangeResponse> listMyServiceRequestHistory(Long userId, Long requestId) {
		ServiceRequest request = findMine(userId, requestId);
		return views.toHistory(request, historyRepository.findAllByServiceRequestIdOrderByIdAsc(requestId));
	}

	@Transactional
	public ServiceRequestResponse cancelServiceRequest(Long userId, Long requestId, @Nullable String reason) {
		ServiceRequest request = findMine(userId, requestId);
		RequestStatus from = request.cancel(reason);
		historyRepository.save(StatusChange.record(requestId, from, RequestStatus.CANCELLED, userId, reason));
		events.publishEvent(new ServiceRequestStatusChanged(requestId, request.getOrganizationId(), userId, from,
				RequestStatus.CANCELLED, userId));
		return views.toResponse(request, false);
	}

	/** Accepting the price confirms the request on the client's side. */
	@Transactional
	public ServiceRequestResponse acceptServiceRequestQuote(Long userId, Long requestId) {
		ServiceRequest request = findMine(userId, requestId);
		RequestStatus from = request.acceptQuote();
		historyRepository.save(StatusChange.record(requestId, from, request.getStatus(), userId, "Devis accepté"));
		events.publishEvent(new ServiceRequestStatusChanged(requestId, request.getOrganizationId(), userId, from,
				request.getStatus(), userId));
		return views.toResponse(request, false);
	}

	@Transactional
	public ServiceRequestResponse declineServiceRequestQuote(Long userId, Long requestId) {
		ServiceRequest request = findMine(userId, requestId);
		request.declineQuote();
		return views.toResponse(request, false);
	}

	private ServiceRequest findMine(Long userId, Long requestId) {
		return requestRepository.findByIdAndUserId(requestId, userId)
			.orElseThrow(() -> AppException.notFound("ServiceRequest", requestId));
	}

	static Instant now() {
		return Instant.now();
	}

}
