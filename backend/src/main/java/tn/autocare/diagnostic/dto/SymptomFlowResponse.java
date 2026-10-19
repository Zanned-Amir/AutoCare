package tn.autocare.diagnostic.dto;

import java.util.List;

/**
 * Everything needed to run a symptom; cached in Redis and used by the backoffice editor.
 */
public record SymptomFlowResponse(SymptomResponse symptom, List<QuestionResponse> questions, List<RuleResponse> rules) {
}
