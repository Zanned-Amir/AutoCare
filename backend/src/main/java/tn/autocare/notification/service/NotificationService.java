package tn.autocare.notification.service;

import java.time.Instant;
import java.util.Locale;
import java.util.Set;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.notification.dto.NotificationResponse;
import tn.autocare.notification.entity.Notification;
import tn.autocare.notification.entity.NotificationRecipient;
import tn.autocare.notification.repository.NotificationRecipientRepository;
import tn.autocare.notification.repository.NotificationRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.tx.AfterCommit;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

	private final NotificationRepository notificationRepository;

	private final NotificationRecipientRepository recipientRepository;

	private final NotificationPublisher publisher;

	private final MessageSource messageSource;

	/**
	 * Stores the notification once, one row per recipient, then pushes it live after
	 * commit.
	 */
	@Transactional
	public void sendNotification(NotificationDraft draft) {
		Set<Long> recipients = draft.recipientIds();
		if (recipients.isEmpty()) {
			return;
		}
		Notification notification = notificationRepository
			.save(Notification.create(draft.senderId(), draft.organizationId(), draft.type(), draft.params(),
					draft.title(), draft.body(), draft.resourceType(), draft.resourceId()));
		recipients.forEach(userId -> recipientRepository.save(NotificationRecipient.of(notification, userId)));
		AfterCommit.run(() -> publisher.publishNewNotification(recipients));
	}

	public Page<NotificationResponse> listMyNotifications(Long userId, boolean unreadOnly, Pageable pageable) {
		Page<NotificationRecipient> page = unreadOnly
				? recipientRepository.findAllByUserIdAndDismissedAtIsNullAndReadAtIsNull(userId, pageable)
				: recipientRepository.findAllByUserIdAndDismissedAtIsNull(userId, pageable);
		Locale locale = LocaleContextHolder.getLocale();
		return page.map(recipient -> toResponse(recipient, locale));
	}

	public long countUnreadNotifications(Long userId) {
		return recipientRepository.countByUserIdAndReadAtIsNullAndDismissedAtIsNull(userId);
	}

	@Transactional
	public void markNotificationRead(Long userId, Long notificationId) {
		find(userId, notificationId).markRead(Instant.now());
		AfterCommit.run(() -> publisher.publishNewNotification(Set.of(userId)));
	}

	@Transactional
	public void markAllNotificationsRead(Long userId) {
		recipientRepository.markAllRead(userId, Instant.now());
		AfterCommit.run(() -> publisher.publishNewNotification(Set.of(userId)));
	}

	@Transactional
	public void dismissNotification(Long userId, Long notificationId) {
		find(userId, notificationId).dismiss(Instant.now());
		AfterCommit.run(() -> publisher.publishNewNotification(Set.of(userId)));
	}

	private NotificationRecipient find(Long userId, Long notificationId) {
		return recipientRepository.findByNotificationIdAndUserId(notificationId, userId)
			.orElseThrow(() -> AppException.notFound("Notification", notificationId));
	}

	private NotificationResponse toResponse(NotificationRecipient recipient, Locale locale) {
		Notification n = recipient.getNotification();
		Object[] params = n.getParams().toArray();
		String title = n.getTitle() != null ? n.getTitle()
				: messageSource.getMessage("notification." + n.getType() + ".title", params, n.getType(), locale);
		String body = n.getBody() != null ? n.getBody()
				: messageSource.getMessage("notification." + n.getType() + ".body", params, "", locale);
		return new NotificationResponse(n.getId(), n.getType(), title, body, n.getResourceType(), n.getResourceId(),
				n.getOrganizationId(), recipient.getReadAt() != null, n.getCreatedAt());
	}

}
