package tn.autocare.assistant.api;

/**
 * ai-service noticed that a vehicle has run a full service interval since its last
 * completed request. Consumed by notification.
 */
public record AssistantMaintenanceSuggested(Long userId, Long vehicleId, String vehicleLabel, int mileage,
		int kmSinceLastService) {
}
