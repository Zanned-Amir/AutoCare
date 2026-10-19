package tn.autocare.notification.service;

import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import tn.autocare.notification.api.NotificationFacade;
import tn.autocare.notification.api.SendNotificationCommand;

@Service
@RequiredArgsConstructor
class NotificationFacadeImpl implements NotificationFacade {

	private final NotificationService notificationService;

	@Override
	public void sendNotification(SendNotificationCommand command) {
		notificationService.sendNotification(new NotificationDraft(command.type(), List.of(), command.title(),
				command.body(), command.senderId(), command.organizationId(), command.resourceType(),
				command.resourceId(), command.recipientIds()));
	}

	@Override
	public long countUnreadNotifications(Long userId) {
		return notificationService.countUnreadNotifications(userId);
	}

}
