package tn.autocare.assistant.event;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.assistant.service.AssistantService;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/** Reads what ai-service publishes on {@code assistant.events}. */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "autocare.assistant", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
class AssistantSuggestionsListener {

	static final String MAINTENANCE_REMINDER_SUGGESTED = "MaintenanceReminderSuggested";

	private final AssistantService assistantService;

	private final JsonMapper jsonMapper;

	@KafkaListener(topics = "${autocare.assistant.suggestions-topic}", groupId = "autocare-api")
	void on(String message) {
		SuggestionEnvelope envelope;
		try {
			envelope = jsonMapper.readValue(message, SuggestionEnvelope.class);
		}
		catch (JacksonException ex) {
			log.warn("Unreadable message from ai-service skipped: {}", ex.getMessage());
			return;
		}
		if (MAINTENANCE_REMINDER_SUGGESTED.equals(envelope.type()) && envelope.payload() != null) {
			Payload p = envelope.payload();
			assistantService.publishAssistantMaintenanceSuggestion(envelope.userId(), p.vehicleId(), p.mileage(),
					p.kmSinceLastService());
		}
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record SuggestionEnvelope(String type, Long userId, Payload payload) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record Payload(Long vehicleId, int mileage, int kmSinceLastService) {
	}

}
