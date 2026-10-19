package tn.autocare.servicerequest.service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.ServiceRequestStatsResponse;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.entity.ServiceRequest;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;
import tn.autocare.servicerequest.repository.StatusChangeRepository;
import tn.autocare.shared.exception.AppException;

/** Backoffice oversight of every request on the platform (read only). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminServiceRequestService {

	private final ServiceRequestRepository requestRepository;

	private final StatusChangeRepository historyRepository;

	private final ServiceRequestViews views;

	/**
	 * {@code from}/{@code to} filter the creation day (Tunis time), both included;
	 * several {@code serviceIds} match any of them.
	 */
	public Page<ServiceRequestResponse> searchServiceRequests(@Nullable RequestStatus status,
			@Nullable List<Long> serviceIds, @Nullable Long organizationId, @Nullable Long userId,
			@Nullable LocalDate from, @Nullable LocalDate to, Pageable pageable) {
		Specification<ServiceRequest> filters = (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (status != null) {
				predicates.add(cb.equal(root.get("status"), status));
			}
			if (serviceIds != null && !serviceIds.isEmpty()) {
				predicates.add(root.get("serviceId").in(serviceIds));
			}
			if (organizationId != null) {
				predicates.add(cb.equal(root.get("organizationId"), organizationId));
			}
			if (userId != null) {
				predicates.add(cb.equal(root.get("userId"), userId));
			}
			if (from != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"),
						from.atStartOfDay(ServiceRequestService.TUNIS).toInstant()));
			}
			if (to != null) {
				predicates.add(cb.lessThan(root.get("createdAt"),
						to.plusDays(1).atStartOfDay(ServiceRequestService.TUNIS).toInstant()));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
		Page<ServiceRequest> page = requestRepository.findAll(filters, pageable);
		return new PageImpl<>(views.toResponses(page.getContent(), true), page.getPageable(), page.getTotalElements());
	}

	public ServiceRequestStatsResponse getServiceRequestStats() {
		Map<RequestStatus, Long> byStatus = new EnumMap<>(RequestStatus.class);
		for (RequestStatus status : RequestStatus.values()) {
			byStatus.put(status, 0L);
		}
		for (Object[] row : requestRepository.countAllByStatus()) {
			byStatus.put((RequestStatus) row[0], (Long) row[1]);
		}
		long total = byStatus.values().stream().mapToLong(Long::longValue).sum();
		long today = requestRepository.countByCreatedAtGreaterThanEqual(
				LocalDate.now(ServiceRequestService.TUNIS).atStartOfDay(ServiceRequestService.TUNIS).toInstant());
		return new ServiceRequestStatsResponse(total, today, byStatus);
	}

	public ServiceRequestResponse getServiceRequest(Long requestId) {
		return views.toResponse(find(requestId), true);
	}

	public List<StatusChangeResponse> listServiceRequestHistory(Long requestId) {
		ServiceRequest request = find(requestId);
		return views.toHistory(request, historyRepository.findAllByServiceRequestIdOrderByIdAsc(requestId));
	}

	private ServiceRequest find(Long requestId) {
		return requestRepository.findById(requestId)
			.orElseThrow(() -> AppException.notFound("ServiceRequest", requestId));
	}

}
