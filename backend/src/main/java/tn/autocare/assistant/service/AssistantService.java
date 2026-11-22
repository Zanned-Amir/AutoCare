package tn.autocare.assistant.service;

import java.io.IOException;
import java.time.Duration;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.assistant.api.AssistantMaintenanceSuggested;
import tn.autocare.assistant.config.AssistantProperties;
import tn.autocare.assistant.dto.SendAssistantMessageRequest;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.ratelimit.RequestLimiter;
import tn.autocare.vehicle.api.VehicleFacade;

@Slf4j
@Service
@RequiredArgsConstructor
public class AssistantService {

	private static final Duration ANSWER_TIMEOUT = Duration.ofMinutes(2);

	private static final Duration MESSAGE_COOLDOWN = Duration.ofSeconds(2);

	private static final String UNAVAILABLE = "{\"error\":\"ASSISTANT_UNAVAILABLE\"}";

	private static final String DONE = "[DONE]";

	private final AssistantProperties properties;

	private final AssistantClient assistantClient;

	private final RequestLimiter requestLimiter;

	private final VehicleFacade vehicleFacade;

	private final ApplicationEventPublisher events;

	/**
	 * Relays ai-service's answer on a virtual thread. A failure after the stream has
	 * started is sent as an {@code error} event, since the status is already 200.
	 */
	public SseEmitter sendAssistantMessage(Long userId, SendAssistantMessageRequest request) {
		if (!properties.enabled()) {
			throw new AppException(ErrorCode.ASSISTANT_UNAVAILABLE, "The assistant is turned off");
		}
		long wait = requestLimiter.acquireCooldown("assistant:" + userId, MESSAGE_COOLDOWN);
		if (wait > 0) {
			throw AppException.tooSoon(ErrorCode.ASSISTANT_COOLDOWN, "Wait before sending another message", wait);
		}
		SseEmitter emitter = new SseEmitter(ANSWER_TIMEOUT.toMillis());
		Thread.ofVirtual().name("assistant-answer").start(() -> relayAssistantAnswer(userId, request, emitter));
		return emitter;
	}

	/** Only for the owner's own vehicle: the payload comes from another service. */
	@Transactional
	public void publishAssistantMaintenanceSuggestion(Long userId, Long vehicleId, int mileage,
			int kmSinceLastService) {
		vehicleFacade.findVehicle(vehicleId)
			.filter(vehicle -> vehicle.ownerId().equals(userId))
			.ifPresent(vehicle -> events.publishEvent(new AssistantMaintenanceSuggested(userId, vehicleId,
					vehicle.brand() + " " + vehicle.model(), mileage, kmSinceLastService)));
	}

	private void relayAssistantAnswer(Long userId, SendAssistantMessageRequest request, SseEmitter emitter) {
		try {
			assistantClient.streamAssistantAnswer(userId, request, data -> emitter.send(SseEmitter.event().data(data)));
		}
		catch (RuntimeException ex) {
			log.warn("Assistant answer failed: {}", ex.getMessage());
			sendQuietly(emitter, UNAVAILABLE);
			sendQuietly(emitter, DONE);
		}
		emitter.complete();
	}

	private static void sendQuietly(SseEmitter emitter, String data) {
		try {
			emitter.send(SseEmitter.event().data(data));
		}
		catch (IOException | IllegalStateException ex) {
			// The browser has gone: nothing left to tell.
		}
	}

}
