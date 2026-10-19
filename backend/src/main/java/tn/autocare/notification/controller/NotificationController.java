package tn.autocare.notification.controller;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.notification.api.NotificationPermissions;
import tn.autocare.notification.dto.NotificationResponse;
import tn.autocare.notification.dto.UnreadCountResponse;
import tn.autocare.notification.service.NotificationService;
import tn.autocare.notification.service.NotificationStream;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Notifications")
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + NotificationPermissions.NOTIFICATION_READ + "')")
public class NotificationController {

	private final NotificationService notificationService;

	private final NotificationStream notificationStream;

	@GetMapping
	public PagedModel<NotificationResponse> listMyNotifications(
			@RequestParam(defaultValue = "false") boolean unreadOnly,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(notificationService.listMyNotifications(CurrentUser.id(), unreadOnly, pageable));
	}

	@GetMapping("/unread-count")
	public UnreadCountResponse countUnreadNotifications() {
		return new UnreadCountResponse(notificationService.countUnreadNotifications(CurrentUser.id()));
	}

	/** Live unread count. Read with fetch() so the Authorization header can be sent. */
	@GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public SseEmitter openNotificationStream() {
		return notificationStream.openStream(CurrentUser.id());
	}

	@PostMapping("/{notificationId}/read")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markNotificationRead(@PathVariable Long notificationId) {
		notificationService.markNotificationRead(CurrentUser.id(), notificationId);
	}

	@PostMapping("/read-all")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void markAllNotificationsRead() {
		notificationService.markAllNotificationsRead(CurrentUser.id());
	}

	@DeleteMapping("/{notificationId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void dismissNotification(@PathVariable Long notificationId) {
		notificationService.dismissNotification(CurrentUser.id(), notificationId);
	}

}
