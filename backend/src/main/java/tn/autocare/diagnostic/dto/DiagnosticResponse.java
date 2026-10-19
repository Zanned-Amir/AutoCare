package tn.autocare.diagnostic.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import tn.autocare.diagnostic.entity.DiagnosticUrgency;

/** {@code matched = false}: no rule fits, the client is told to see a professional. */
public record DiagnosticResponse(Long id, Long symptomId, String symptomLabel, Long vehicleId, boolean matched,
		String possibleCause, String recommendation, DiagnosticUrgency urgency, SuggestedService suggestedService,
		Map<String, List<String>> answers, Instant createdAt) {
}
