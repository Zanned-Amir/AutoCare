package tn.autocare.servicerequest.dto;

import java.time.Instant;
import tn.autocare.servicerequest.api.RequestStatus;

/** {@code actor}: CLIENT or PROVIDER. Staff names are not shown to clients. */
public record StatusChangeResponse(RequestStatus fromStatus, RequestStatus toStatus, String actor, String note,
		Instant createdAt) {
}
