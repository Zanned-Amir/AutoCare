package tn.autocare.notification.service;

import java.nio.charset.StandardCharsets;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

/** Receives the pub/sub message on every instance and pushes to the streams open here. */
@Component
@RequiredArgsConstructor
public class NotificationRelay implements MessageListener {

	private final NotificationStream stream;

	@Override
	public void onMessage(Message message, byte[] pattern) {
		stream.pushUnreadCount(NotificationPublisher.parse(new String(message.getBody(), StandardCharsets.UTF_8)));
	}

}
