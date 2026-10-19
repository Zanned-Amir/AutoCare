package tn.autocare.servicerequest.entity;

import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

import tn.autocare.servicerequest.api.RequestStatus;

/**
 * Allowed status changes. Who may make each one is checked by the services (provider
 * permissions or the client who created the request).
 */
public final class ServiceRequestWorkflow {

	private static final Map<RequestStatus, Set<RequestStatus>> NEXT = new EnumMap<>(RequestStatus.class);

	static {
		NEXT.put(RequestStatus.PENDING,
				Set.of(RequestStatus.CONFIRMED, RequestStatus.REJECTED, RequestStatus.CANCELLED));
		NEXT.put(RequestStatus.CONFIRMED, Set.of(RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED));
		NEXT.put(RequestStatus.IN_PROGRESS, Set.of(RequestStatus.COMPLETED));
		NEXT.put(RequestStatus.COMPLETED, Set.of());
		NEXT.put(RequestStatus.REJECTED, Set.of());
		NEXT.put(RequestStatus.CANCELLED, Set.of());
	}

	private ServiceRequestWorkflow() {
	}

	public static boolean canMove(RequestStatus from, RequestStatus to) {
		return NEXT.get(from).contains(to);
	}

	public static boolean isOpen(RequestStatus status) {
		return !NEXT.get(status).isEmpty();
	}

}
