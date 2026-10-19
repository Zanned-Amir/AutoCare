package tn.autocare.notification.api;

/**
 * Free-text notifications from other modules; module events are handled by listeners
 * here.
 */
public interface NotificationFacade {

	void sendNotification(SendNotificationCommand command);

	long countUnreadNotifications(Long userId);

}
