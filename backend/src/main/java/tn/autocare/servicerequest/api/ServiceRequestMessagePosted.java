package tn.autocare.servicerequest.api;

/** A message was posted on a request: the other side is told. */
public record ServiceRequestMessagePosted(Long serviceRequestId, Long organizationId, Long userId, Long authorId,
		MessageSide side, String preview) {
}
