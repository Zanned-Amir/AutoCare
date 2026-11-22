package tn.autocare.assistant.event;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.assistant.config.AssistantProperties;
import tn.autocare.servicerequest.api.ServiceRequestCompleted;
import tn.autocare.vehicle.api.VehicleDeleted;
import tn.autocare.vehicle.api.VehicleSaved;
import tools.jackson.databind.json.JsonMapper;

/**
 * Sends the events ai-service needs to Kafka (after the action's commit; a failed send is
 * retried by the event registry). Key = user id, so a user's events stay in order.
 */
@Component
@ConditionalOnProperty(prefix = "autocare.assistant", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
class AssistantEventsForwarder {

	private final KafkaTemplate<String, String> kafkaTemplate;

	private final AssistantProperties properties;

	private final JsonMapper jsonMapper;

	@ApplicationModuleListener
	void on(VehicleSaved event) {
		forwardEvent(event.ownerId(), event);
	}

	@ApplicationModuleListener
	void on(VehicleDeleted event) {
		forwardEvent(event.ownerId(), event);
	}

	@ApplicationModuleListener
	void on(ServiceRequestCompleted event) {
		forwardEvent(event.userId(), event);
	}

	private void forwardEvent(Long userId, Object event) {
		String message = jsonMapper.writeValueAsString(new EventEnvelope(UUID.randomUUID().toString(),
				event.getClass().getSimpleName(), Instant.now(), userId, event));
		try {
			kafkaTemplate.send(properties.eventsTopic(), userId.toString(), message).get(10, TimeUnit.SECONDS);
		}
		catch (InterruptedException ex) {
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Interrupted while sending to Kafka", ex);
		}
		catch (ExecutionException | TimeoutException ex) {
			throw new IllegalStateException("Kafka send failed", ex);
		}
	}

	/** Same envelope in both topics, see ai-service/README.md. */
	record EventEnvelope(String eventId, String type, Instant occurredAt, Long userId, Object payload) {
	}

}
