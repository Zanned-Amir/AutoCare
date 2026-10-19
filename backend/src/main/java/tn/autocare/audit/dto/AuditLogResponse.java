package tn.autocare.audit.dto;

import java.time.Instant;
import java.util.Map;

import tn.autocare.audit.api.AuditTargetType;

/** {@code actorName} is empty when the account no longer exists. */
public record AuditLogResponse(Long id, Long actorId, String actorName, String action, AuditTargetType targetType,
		Long targetId, Map<String, Object> details, Instant createdAt) {
}
