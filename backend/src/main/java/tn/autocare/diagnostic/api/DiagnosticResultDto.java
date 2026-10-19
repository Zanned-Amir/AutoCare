package tn.autocare.diagnostic.api;

public record DiagnosticResultDto(Long id, Long userId, Long vehicleId, Long symptomId, String possibleCause,
		String recommendation, Long suggestedServiceId) {
}
