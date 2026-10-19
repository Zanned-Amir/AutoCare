package tn.autocare.diagnostic.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tn.autocare.diagnostic.entity.DiagnosticUrgency;
import tn.autocare.diagnostic.entity.RuleCondition;

public record SaveRuleRequest(@NotBlank @Size(max = 120) String name,
		@NotNull @Size(max = 10) List<@Valid RuleCondition> conditions, @NotNull @Min(0) @Max(1000) Integer priority,
		@NotBlank @Size(max = 300) String possibleCause, @NotBlank @Size(max = 1000) String recommendation,
		Long serviceId, @NotNull DiagnosticUrgency urgency) {
}
