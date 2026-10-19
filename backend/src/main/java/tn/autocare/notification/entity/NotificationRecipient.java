package tn.autocare.notification.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "notification", name = "recipients")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NotificationRecipient extends BaseEntity {

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "notification_id", nullable = false)
	private Notification notification;

	@Column(name = "user_id", nullable = false)
	private Long userId;

	@Column(name = "read_at")
	private Instant readAt;

	@Column(name = "dismissed_at")
	private Instant dismissedAt;

	public static NotificationRecipient of(Notification notification, Long userId) {
		NotificationRecipient recipient = new NotificationRecipient();
		recipient.notification = notification;
		recipient.userId = userId;
		return recipient;
	}

	public void markRead(Instant now) {
		if (readAt == null) {
			readAt = now;
		}
	}

	public void dismiss(Instant now) {
		markRead(now);
		dismissedAt = now;
	}

}
