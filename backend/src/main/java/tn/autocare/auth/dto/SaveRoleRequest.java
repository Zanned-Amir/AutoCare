package tn.autocare.auth.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * {@code name} is the key put in tokens (UPPER_SNAKE, fixed once created);
 * {@code permissions} are {@code resource:action} strings, {@code *} allowed.
 */
public record SaveRoleRequest(
		@NotBlank @Pattern(regexp = "^[A-Z][A-Z0-9_]{1,49}$", message = "must be UPPER_SNAKE_CASE") String name,
		@NotBlank @Size(max = 80) String label, @Size(max = 255) String description,
		@NotNull @Size(max = 200) List<@Pattern(regexp = "^([a-z_]+|\\*):([a-z_]+|\\*)$",
				message = "must be resource:action") String> permissions,
		boolean backoffice) {
}
