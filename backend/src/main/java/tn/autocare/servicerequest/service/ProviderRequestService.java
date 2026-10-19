package tn.autocare.servicerequest.service;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.api.ServiceRequestCompleted;
import tn.autocare.servicerequest.api.ServiceRequestQuoted;
import tn.autocare.servicerequest.api.ServiceRequestStatusChanged;
import tn.autocare.servicerequest.dto.CompleteServiceRequestRequest;
import tn.autocare.servicerequest.dto.SendQuoteRequest;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.entity.ServiceRequest;
import tn.autocare.servicerequest.entity.StatusChange;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;
import tn.autocare.servicerequest.repository.StatusChangeRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehicleFacade;

/**
 * The provider's side. The controller checks the member's permission for each action; a
 * request of another organization answers 404.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProviderRequestService {

	private final ServiceRequestRepository requestRepository;

	private final StatusChangeRepository historyRepository;

	private final ServiceRequestViews views;

	private final VehicleFacade vehicleFacade;

	private final ApplicationEventPublisher events;

	static final int MAX_CALENDAR_DAYS = 62;

	public Page<ServiceRequestResponse> listOrganizationServiceRequests(Long organizationId,
			@Nullable RequestStatus status, Pageable pageable) {
		Page<ServiceRequest> page = status == null ? requestRepository.findAllByOrganizationId(organizationId, pageable)
				: requestRepository.findAllByOrganizationIdAndStatus(organizationId, status, pageable);
		List<ServiceRequestResponse> content = views.toResponses(page.getContent(), true);
		return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
	}

	/**
	 * The organization's requests whose desired day is in the range (at most 62 days).
	 */
	public List<ServiceRequestResponse> listOrganizationCalendar(Long organizationId, LocalDate from, LocalDate to) {
		if (to.isBefore(from) || from.plusDays(MAX_CALENDAR_DAYS).isBefore(to)) {
			throw new AppException(ErrorCode.VALIDATION_FAILED, "The range must be 1 to 62 days");
		}
		return views.toResponses(requestRepository
			.findAllByOrganizationIdAndDesiredDateBetweenOrderByDesiredDateAscDesiredTimeAsc(organizationId, from, to),
				true);
	}

	public Map<RequestStatus, Long> countOrganizationServiceRequests(Long organizationId) {
		Map<RequestStatus, Long> counts = new EnumMap<>(RequestStatus.class);
		for (RequestStatus status : RequestStatus.values()) {
			counts.put(status, 0L);
		}
		for (Object[] row : requestRepository.countByStatus(organizationId)) {
			counts.put((RequestStatus) row[0], (Long) row[1]);
		}
		return counts;
	}

	public ServiceRequestResponse getOrganizationServiceRequest(Long organizationId, Long requestId) {
		return views.toResponse(find(organizationId, requestId), true);
	}

	public List<StatusChangeResponse> listOrganizationServiceRequestHistory(Long organizationId, Long requestId) {
		ServiceRequest request = find(organizationId, requestId);
		return views.toHistory(request, historyRepository.findAllByServiceRequestIdOrderByIdAsc(requestId));
	}

	@Transactional
	public ServiceRequestResponse confirmServiceRequest(Long organizationId, Long requestId, Long memberId) {
		ServiceRequest request = find(organizationId, requestId);
		return changed(request, request.confirm(), memberId, null);
	}

	@Transactional
	public ServiceRequestResponse rejectServiceRequest(Long organizationId, Long requestId, Long memberId,
			String reason) {
		ServiceRequest request = find(organizationId, requestId);
		return changed(request, request.reject(reason), memberId, reason);
	}

	@Transactional
	public ServiceRequestResponse sendServiceRequestQuote(Long organizationId, Long requestId, SendQuoteRequest quote) {
		ServiceRequest request = find(organizationId, requestId);
		request.sendQuote(quote.amount(), quote.note(), ServiceRequestService.now());
		events.publishEvent(new ServiceRequestQuoted(request.getId(), organizationId, request.getUserId(),
				request.getQuoteAmount(), request.getQuoteCurrency()));
		return views.toResponse(request, true);
	}

	@Transactional
	public ServiceRequestResponse startServiceRequest(Long organizationId, Long requestId, Long memberId) {
		ServiceRequest request = find(organizationId, requestId);
		return changed(request, request.start(), memberId, null);
	}

	/** Raises the vehicle mileage if a higher reading is given, then reports the work. */
	@Transactional
	public ServiceRequestResponse completeServiceRequest(Long organizationId, Long requestId, Long memberId,
			CompleteServiceRequestRequest report) {
		ServiceRequest request = find(organizationId, requestId);
		RequestStatus from = request.complete(ServiceRequestService.now());
		VehicleDto vehicle = vehicleFacade.getVehicle(request.getVehicleId());
		int mileage = vehicle.mileage();
		if (report.mileage() != null && report.mileage() > vehicle.mileage()) {
			vehicleFacade.updateVehicleMileage(vehicle.id(), report.mileage());
			mileage = report.mileage();
		}
		ServiceRequestResponse response = changed(request, from, memberId, null);
		events.publishEvent(new ServiceRequestCompleted(request.getId(), organizationId, request.getUserId(),
				request.getVehicleId(), request.getServiceId(), request.getCompletedAt(), mileage,
				blankToNull(report.result()), blankToNull(report.recommendations())));
		return response;
	}

	private ServiceRequestResponse changed(ServiceRequest request, RequestStatus from, Long memberId,
			@Nullable String note) {
		historyRepository.save(StatusChange.record(request.getId(), from, request.getStatus(), memberId, note));
		events.publishEvent(new ServiceRequestStatusChanged(request.getId(), request.getOrganizationId(),
				request.getUserId(), from, request.getStatus(), memberId));
		return views.toResponse(request, true);
	}

	private ServiceRequest find(Long organizationId, Long requestId) {
		return requestRepository.findByIdAndOrganizationId(requestId, organizationId)
			.orElseThrow(() -> AppException.notFound("ServiceRequest", requestId));
	}

	private static @Nullable String blankToNull(@Nullable String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}

}
