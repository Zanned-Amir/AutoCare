package tn.autocare.diagnostic.dto;

import java.util.List;

/** What the client sees before answering: the rules stay on the server. */
public record SymptomQuestionsResponse(SymptomResponse symptom, List<QuestionResponse> questions) {
}
