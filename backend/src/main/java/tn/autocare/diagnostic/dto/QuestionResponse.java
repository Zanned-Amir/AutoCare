package tn.autocare.diagnostic.dto;

import java.util.List;
import tn.autocare.diagnostic.entity.AnswerType;

public record QuestionResponse(Long id, Long symptomId, String text, AnswerType answerType, List<String> options,
		int position) {
}
