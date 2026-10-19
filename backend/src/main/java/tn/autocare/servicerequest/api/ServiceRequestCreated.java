package tn.autocare.servicerequest.api;

public record ServiceRequestCreated(Long serviceRequestId, Long organizationId, Long userId, Long serviceId) {
}
