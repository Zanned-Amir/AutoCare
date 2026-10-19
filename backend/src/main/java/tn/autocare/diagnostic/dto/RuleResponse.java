package tn.autocare.diagnostic.dto;

import java.util.List;
import tn.autocare.diagnostic.entity.DiagnosticUrgency;
import tn.autocare.diagnostic.entity.RuleCondition;

public record RuleResponse(Long id, Long symptomId, String name, List<RuleCondition> conditions, int priority,
		String possibleCause, String recommendation, Long serviceId, String serviceName, DiagnosticUrgency urgency) {
}
