package tn.autocare.servicerequest.api;

import java.time.Instant;

import org.jspecify.annotations.Nullable;

/** Consumed by maintenance (history record), notification and review (V2). */
public record ServiceRequestCompleted(Long serviceRequestId, Long organizationId, Long userId, Long vehicleId,
		Long serviceId, Instant completedAt, int mileage, @Nullable String result, @Nullable String recommendations) {
}
