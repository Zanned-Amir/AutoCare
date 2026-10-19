package tn.autocare.organization.dto;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ChangeMemberPermissionsRequest(@NotNull List<@Pattern(regexp = "^([a-z_]+|\\*):([a-z_]+|\\*)$",
		message = "must be resource:action") String> permissions) {
}
