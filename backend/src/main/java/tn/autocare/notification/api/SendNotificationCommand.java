package tn.autocare.notification.api;

import java.util.Set;

import org.jspecify.annotations.Nullable;

public record SendNotificationCommand(@Nullable Long senderId, @Nullable Long organizationId, String type, String title,
		String body, @Nullable String resourceType, @Nullable Long resourceId, Set<Long> recipientIds) {
}
