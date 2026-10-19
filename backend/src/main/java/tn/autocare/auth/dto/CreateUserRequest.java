package tn.autocare.auth.dto;

import java.util.List;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * An account opened by an admin. The person chooses a password from the invitation
 * e-mail; {@code roles} defaults to USER.
 */
public record CreateUserRequest(@NotBlank @Email @Size(max = 254) String email,
		@NotBlank @Size(max = 120) String fullName,
		@Size(max = 30) @Pattern(regexp = "^\\+?[0-9 .-]{8,20}$", message = "must be a phone number") String phone,
		@Pattern(regexp = "^(fr|en)$", message = "must be fr or en") String locale, List<@NotBlank String> roles) {
}
