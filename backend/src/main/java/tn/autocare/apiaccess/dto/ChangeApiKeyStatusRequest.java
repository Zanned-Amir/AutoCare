package tn.autocare.apiaccess.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** ACTIVE or DISABLED (revoke has its own endpoint). */
public record ChangeApiKeyStatusRequest(@NotNull @Pattern(regexp = "ACTIVE|DISABLED") String status) {
}
