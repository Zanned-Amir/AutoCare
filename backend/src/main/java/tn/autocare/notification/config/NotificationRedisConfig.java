package tn.autocare.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import tn.autocare.notification.service.NotificationPublisher;
import tn.autocare.notification.service.NotificationRelay;

@Configuration
class NotificationRedisConfig {

	@Bean
	RedisMessageListenerContainer notificationListenerContainer(RedisConnectionFactory connectionFactory,
			NotificationRelay relay) {
		RedisMessageListenerContainer container = new RedisMessageListenerContainer();
		container.setConnectionFactory(connectionFactory);
		container.addMessageListener(relay, new ChannelTopic(NotificationPublisher.CHANNEL));
		return container;
	}

}
