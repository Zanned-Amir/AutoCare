package tn.autocare.diagnostic.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import tn.autocare.diagnostic.dto.QuestionResponse;
import tn.autocare.diagnostic.dto.RuleResponse;
import tn.autocare.diagnostic.entity.AnswerType;
import tn.autocare.diagnostic.entity.ConditionOperator;
import tn.autocare.diagnostic.entity.DiagnosticUrgency;
import tn.autocare.diagnostic.entity.RuleCondition;
import tn.autocare.shared.exception.AppException;

class DiagnosticRuleEngineTests {

	static final QuestionResponse PEDAL = new QuestionResponse(1L, 1L, "Pédale molle ?", AnswerType.YES_NO, List.of(),
			0);

	static final QuestionResponse NOISE = new QuestionResponse(2L, 1L, "Bruit ?", AnswerType.SINGLE_CHOICE,
			List.of("Grincement", "Frottement"), 1);

	static final QuestionResponse KM = new QuestionResponse(3L, 1L, "Km ?", AnswerType.NUMBER, List.of(), 2);

	static final QuestionResponse SIGNS = new QuestionResponse(4L, 1L, "Signes ?", AnswerType.MULTIPLE_CHOICE,
			List.of("Fumée", "Odeur"), 3);

	static final List<QuestionResponse> QUESTIONS = List.of(PEDAL, NOISE, KM, SIGNS);

	@Test
	void highestPriorityMatchingRuleWins() {
		var rules = List.of(rule(10, 0), rule(11, 30, cond(1, ConditionOperator.EQUALS, "true")),
				rule(12, 20, cond(2, ConditionOperator.EQUALS, "Frottement")));
		var answers = DiagnosticRuleEngine.normalizeAnswers(QUESTIONS,
				Map.of(1L, true, 2L, "Frottement", 3L, 12000, 4L, List.of("Odeur")));
		assertThat(DiagnosticRuleEngine.pickRule(rules, answers)).get().extracting(RuleResponse::id).isEqualTo(11L);
	}

	@Test
	void fallbackRuleMatchesWhenNothingElseDoes() {
		var rules = List.of(rule(10, 0), rule(11, 30, cond(1, ConditionOperator.EQUALS, "true")));
		var answers = DiagnosticRuleEngine.normalizeAnswers(QUESTIONS,
				Map.of(1L, false, 2L, "Grincement", 3L, "500", 4L, List.of()));
		assertThat(DiagnosticRuleEngine.pickRule(rules, answers)).get().extracting(RuleResponse::id).isEqualTo(10L);
		assertThat(DiagnosticRuleEngine.pickRule(List.of(rules.get(1)), answers)).isEmpty();
	}

	@Test
	void numbersAndMultipleChoicesCompare() {
		var answers = Map.of(3L, List.of("12000"), 4L, List.of("Fumée", "Odeur"));
		assertThat(DiagnosticRuleEngine.matches(cond(3, ConditionOperator.AT_LEAST, "10000"), answers.get(3L)))
			.isTrue();
		assertThat(DiagnosticRuleEngine.matches(cond(3, ConditionOperator.AT_MOST, "10000"), answers.get(3L)))
			.isFalse();
		assertThat(DiagnosticRuleEngine.matches(cond(4, ConditionOperator.INCLUDES, "Fumée"), answers.get(4L)))
			.isTrue();
	}

	@Test
	void refusesMissingOrWrongAnswers() {
		assertThatThrownBy(() -> DiagnosticRuleEngine.normalizeAnswers(QUESTIONS, Map.of(1L, true)))
			.isInstanceOf(AppException.class);
		assertThatThrownBy(() -> DiagnosticRuleEngine.normalizeAnswers(QUESTIONS,
				Map.of(1L, true, 2L, "Klaxon", 3L, 1, 4L, List.of())))
			.isInstanceOf(AppException.class);
		assertThatThrownBy(() -> DiagnosticRuleEngine.normalizeAnswers(QUESTIONS,
				Map.of(1L, true, 2L, "Grincement", 3L, -5, 4L, List.of())))
			.isInstanceOf(AppException.class);
	}

	@Test
	void conditionsMustFitTheQuestion() {
		assertThat(DiagnosticRuleEngine.isValidCondition(cond(1, ConditionOperator.EQUALS, "true"), PEDAL)).isTrue();
		assertThat(DiagnosticRuleEngine.isValidCondition(cond(1, ConditionOperator.EQUALS, "oui"), PEDAL)).isFalse();
		assertThat(DiagnosticRuleEngine.isValidCondition(cond(2, ConditionOperator.EQUALS, "Klaxon"), NOISE)).isFalse();
		assertThat(DiagnosticRuleEngine.isValidCondition(cond(3, ConditionOperator.EQUALS, "10"), KM)).isFalse();
		assertThat(DiagnosticRuleEngine.isValidQuestion(AnswerType.SINGLE_CHOICE, List.of("A"))).isFalse();
	}

	private static RuleCondition cond(long questionId, ConditionOperator operator, String value) {
		return new RuleCondition(questionId, operator, value);
	}

	private static RuleResponse rule(long id, int priority, RuleCondition... conditions) {
		return new RuleResponse(id, 1L, "r" + id, List.of(conditions), priority, "cause " + id, "fix", null, null,
				DiagnosticUrgency.LOW);
	}

}
