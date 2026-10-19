package tn.autocare.auth.dto;

import java.time.Instant;

/** One signed-in device. {@code current} is the session making this request. */
public record SessionResponse(Long id, String device, String ipAddress, Instant startedAt, Instant lastActiveAt,
		boolean current) {
}
