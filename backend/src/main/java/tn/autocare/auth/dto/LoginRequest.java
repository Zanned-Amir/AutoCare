package tn.autocare.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * {@code scope}: "customer" (default) or "backoffice" (staff only), like the template's
 * login_scope.
 */
public record LoginRequest(@NotBlank @Email String email, @NotBlank String password,
		@Pattern(regexp = "customer|backoffice") String scope) {
}
