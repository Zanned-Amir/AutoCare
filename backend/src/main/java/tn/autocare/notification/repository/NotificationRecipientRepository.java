package tn.autocare.notification.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.notification.entity.NotificationRecipient;

public interface NotificationRecipientRepository extends JpaRepository<NotificationRecipient, Long> {

	@EntityGraph(attributePaths = "notification")
	Page<NotificationRecipient> findAllByUserIdAndDismissedAtIsNull(Long userId, Pageable pageable);

	@EntityGraph(attributePaths = "notification")
	Page<NotificationRecipient> findAllByUserIdAndDismissedAtIsNullAndReadAtIsNull(Long userId, Pageable pageable);

	Optional<NotificationRecipient> findByNotificationIdAndUserId(Long notificationId, Long userId);

	long countByUserIdAndReadAtIsNullAndDismissedAtIsNull(Long userId);

	@Modifying
	@Query("update NotificationRecipient r set r.readAt = ?2 where r.userId = ?1 and r.readAt is null")
	int markAllRead(Long userId, Instant now);

}
