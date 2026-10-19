package tn.autocare.diagnostic.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.jspecify.annotations.Nullable;

import tn.autocare.diagnostic.dto.QuestionResponse;
import tn.autocare.diagnostic.dto.RuleResponse;
import tn.autocare.diagnostic.entity.AnswerType;
import tn.autocare.diagnostic.entity.ConditionOperator;
import tn.autocare.diagnostic.entity.RuleCondition;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Pure logic, no Spring: checks answers, then picks the matching rule with the highest
 * priority (lowest id on a tie).
 */
final class DiagnosticRuleEngine {

	private DiagnosticRuleEngine() {
	}

	/** Every question must be answered with a value its type accepts. */
	static Map<Long, List<String>> normalizeAnswers(List<QuestionResponse> questions, Map<Long, Object> raw) {
		Map<Long, List<String>> answers = new LinkedHashMap<>();
		for (QuestionResponse question : questions) {
			Object value = raw.get(question.id());
			if (value == null) {
				throw invalidAnswer(question, "is not answered");
			}
			answers.put(question.id(), normalize(question, value));
		}
		if (!new HashSet<>(answers.keySet()).containsAll(raw.keySet())) {
			throw new AppException(ErrorCode.DIAGNOSTIC_ANSWERS_INVALID, "Answer to an unknown question");
		}
		return answers;
	}

	static Optional<RuleResponse> pickRule(List<RuleResponse> rules, Map<Long, List<String>> answers) {
		return rules.stream()
			.filter(rule -> rule.conditions().stream().allMatch(c -> matches(c, answers.get(c.questionId()))))
			.min(Comparator.comparingInt(RuleResponse::priority).reversed().thenComparing(RuleResponse::id));
	}

	static boolean matches(RuleCondition condition, @Nullable List<String> answer) {
		if (answer == null || answer.isEmpty()) {
			return false;
		}
		return switch (condition.operator()) {
			case EQUALS -> answer.size() == 1 && answer.getFirst().equals(condition.value());
			case INCLUDES -> answer.contains(condition.value());
			case AT_LEAST -> compare(answer.getFirst(), condition.value()) >= 0;
			case AT_MOST -> compare(answer.getFirst(), condition.value()) <= 0;
		};
	}

	/** Backoffice check: the operator and value must fit the question's answer type. */
	static boolean isValidCondition(RuleCondition condition, QuestionResponse question) {
		ConditionOperator operator = condition.operator();
		String value = condition.value();
		return switch (question.answerType()) {
			case YES_NO -> operator == ConditionOperator.EQUALS && (value.equals("true") || value.equals("false"));
			case SINGLE_CHOICE -> operator == ConditionOperator.EQUALS && question.options().contains(value);
			case MULTIPLE_CHOICE -> operator == ConditionOperator.INCLUDES && question.options().contains(value);
			case NUMBER -> (operator == ConditionOperator.AT_LEAST || operator == ConditionOperator.AT_MOST)
					&& toNumber(value) != null;
		};
	}

	static boolean isValidQuestion(AnswerType type, List<String> options) {
		if (type == AnswerType.SINGLE_CHOICE || type == AnswerType.MULTIPLE_CHOICE) {
			return options.size() >= 2 && options.stream().map(String::trim).distinct().count() == options.size()
					&& options.stream().noneMatch(String::isBlank);
		}
		return true;
	}

	private static List<String> normalize(QuestionResponse question, Object value) {
		return switch (question.answerType()) {
			case YES_NO -> {
				if (value instanceof Boolean bool) {
					yield List.of(bool.toString());
				}
				if (value instanceof String text && (text.equals("true") || text.equals("false"))) {
					yield List.of(text);
				}
				throw invalidAnswer(question, "expects yes or no");
			}
			case SINGLE_CHOICE -> {
				if (value instanceof String text && question.options().contains(text)) {
					yield List.of(text);
				}
				throw invalidAnswer(question, "expects one of its choices");
			}
			case MULTIPLE_CHOICE -> {
				if (value instanceof List<?> list && list.stream()
					.allMatch(item -> item instanceof String text && question.options().contains(text))) {
					yield list.stream().map(String.class::cast).distinct().toList();
				}
				throw invalidAnswer(question, "expects a list of its choices");
			}
			case NUMBER -> {
				BigDecimal number = toNumber(value);
				if (number == null || number.signum() < 0) {
					throw invalidAnswer(question, "expects a positive number");
				}
				yield List.of(number.stripTrailingZeros().toPlainString());
			}
		};
	}

	private static int compare(String answer, String expected) {
		BigDecimal left = toNumber(answer);
		BigDecimal right = toNumber(expected);
		if (left == null || right == null) {
			return Integer.MIN_VALUE;
		}
		return left.compareTo(right);
	}

	private static @Nullable BigDecimal toNumber(Object value) {
		try {
			if (value instanceof Number number) {
				return new BigDecimal(number.toString());
			}
			if (value instanceof String text) {
				return new BigDecimal(text.trim());
			}
		}
		catch (NumberFormatException ex) {
			return null;
		}
		return null;
	}

	private static AppException invalidAnswer(QuestionResponse question, String reason) {
		return new AppException(ErrorCode.DIAGNOSTIC_ANSWERS_INVALID, "Question " + question.id() + " " + reason);
	}

}
