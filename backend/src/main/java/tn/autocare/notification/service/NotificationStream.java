package tn.autocare.notification.service;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.RequiredArgsConstructor;

/**
 * Live streams (Server-Sent Events) open on this instance. Each event only carries the
 * unread count; the app reloads the list itself.
 */
@Component
@RequiredArgsConstructor
public class NotificationStream {

	private static final Duration TIMEOUT = Duration.ofMinutes(30);

	private final Map<Long, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

	private final NotificationService notificationService;

	public SseEmitter openStream(Long userId) {
		SseEmitter emitter = new SseEmitter(TIMEOUT.toMillis());
		emitters.computeIfAbsent(userId, id -> new CopyOnWriteArraySet<>()).add(emitter);
		emitter.onCompletion(() -> remove(userId, emitter));
		emitter.onTimeout(() -> remove(userId, emitter));
		emitter.onError(error -> remove(userId, emitter));
		send(userId, emitter, notificationService.countUnreadNotifications(userId));
		return emitter;
	}

	/** Called for every pub/sub message; users without a stream here are skipped. */
	void pushUnreadCount(Set<Long> userIds) {
		for (Long userId : userIds) {
			Set<SseEmitter> userEmitters = emitters.get(userId);
			if (userEmitters == null || userEmitters.isEmpty()) {
				continue;
			}
			long count = notificationService.countUnreadNotifications(userId);
			userEmitters.forEach(emitter -> send(userId, emitter, count));
		}
	}

	// Proxies close idle connections; a comment every 25 s keeps the stream open.
	@Scheduled(fixedRate = 25_000)
	void sendHeartbeat() {
		emitters.forEach((userId, userEmitters) -> userEmitters.forEach(emitter -> {
			try {
				emitter.send(SseEmitter.event().comment("ping"));
			}
			catch (IOException | IllegalStateException ex) {
				remove(userId, emitter);
			}
		}));
	}

	int openStreamCount(Long userId) {
		return emitters.getOrDefault(userId, Set.of()).size();
	}

	private void send(Long userId, SseEmitter emitter, long count) {
		try {
			emitter.send(SseEmitter.event().name("unread").data(Map.of("count", count)));
		}
		catch (IOException | IllegalStateException ex) {
			remove(userId, emitter);
		}
	}

	private void remove(Long userId, SseEmitter emitter) {
		emitters.computeIfPresent(userId, (id, set) -> {
			set.remove(emitter);
			return set.isEmpty() ? null : set;
		});
	}

}
