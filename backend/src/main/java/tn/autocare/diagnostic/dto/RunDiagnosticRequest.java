package tn.autocare.diagnostic.dto;

import java.util.Map;
import jakarta.validation.constraints.NotNull;

/**
 * {@code answers}: question id to a boolean (yes/no), a choice, a list of choices or a
 * number.
 */
public record RunDiagnosticRequest(@NotNull Long symptomId, Long vehicleId, @NotNull Map<Long, Object> answers) {
}
