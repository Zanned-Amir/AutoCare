package tn.autocare.assistant.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/** Creates the two topics on start (one partition: the user id key keeps a user's events in order). */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(prefix = "autocare.assistant", name = "enabled", havingValue = "true")
class AssistantKafkaConfig {

	@Bean
	NewTopic assistantEventsTopic(AssistantProperties properties) {
		return TopicBuilder.name(properties.eventsTopic()).partitions(1).replicas(1).build();
	}

	@Bean
	NewTopic assistantSuggestionsTopic(AssistantProperties properties) {
		return TopicBuilder.name(properties.suggestionsTopic()).partitions(1).replicas(1).build();
	}

}
