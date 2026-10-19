package tn.autocare.notification.dto;

import java.time.Instant;

/** {@code resourceType} + {@code resourceId} tell the app which page to open. */
public record NotificationResponse(Long id, String type, String title, String body, String resourceType,
		Long resourceId, Long organizationId, boolean read, Instant createdAt) {
}
