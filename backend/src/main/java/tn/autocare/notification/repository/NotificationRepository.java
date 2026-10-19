package tn.autocare.notification.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.notification.entity.Notification;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

}
