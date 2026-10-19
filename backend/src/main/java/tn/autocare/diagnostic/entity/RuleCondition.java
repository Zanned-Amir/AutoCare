package tn.autocare.diagnostic.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** One test on one answer. Values are strings: "true", a choice, or a number. */
public record RuleCondition(@NotNull Long questionId, @NotNull ConditionOperator operator,
		@NotBlank @Size(max = 120) String value) {
}
