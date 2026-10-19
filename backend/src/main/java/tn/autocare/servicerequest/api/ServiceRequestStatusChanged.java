package tn.autocare.servicerequest.api;

public record ServiceRequestStatusChanged(Long serviceRequestId, Long organizationId, Long userId,
		RequestStatus fromStatus, RequestStatus toStatus, Long changedBy) {
}
