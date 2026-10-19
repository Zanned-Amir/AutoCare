package tn.autocare.notification.service;

import java.util.List;
import java.util.Set;

/**
 * What to send and to whom. Either a translated {@code type} with params, or free text.
 */
public record NotificationDraft(String type, List<String> params, String title, String body, Long senderId,
		Long organizationId, String resourceType, Long resourceId, Set<Long> recipientIds) {

	public static NotificationDraft translated(String type, List<String> params, Long organizationId,
			String resourceType, Long resourceId, Set<Long> recipientIds) {
		return new NotificationDraft(type, params, null, null, null, organizationId, resourceType, resourceId,
				recipientIds);
	}

}
