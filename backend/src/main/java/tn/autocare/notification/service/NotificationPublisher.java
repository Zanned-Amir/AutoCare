package tn.autocare.notification.service;

import java.util.Arrays;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Tells every API instance (Redis pub/sub) which users have news, so the instance holding
 * their live stream can push the new unread count.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationPublisher {

	public static final String CHANNEL = "autocare:notifications";

	private final StringRedisTemplate redis;

	public void publishNewNotification(Collection<Long> userIds) {
		try {
			redis.convertAndSend(CHANNEL, userIds.stream().map(String::valueOf).collect(Collectors.joining(",")));
		}
		catch (RuntimeException ex) {
			// Live push is a bonus: the app still sees the notification on its next poll.
			log.warn("Could not publish live notification: {}", ex.getMessage());
		}
	}

	static Set<Long> parse(String message) {
		return Arrays.stream(message.split(","))
			.filter(part -> !part.isBlank())
			.map(Long::valueOf)
			.collect(Collectors.toSet());
	}

}
