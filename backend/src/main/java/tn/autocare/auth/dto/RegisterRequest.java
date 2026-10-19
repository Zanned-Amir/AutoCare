package tn.autocare.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(@NotBlank @Email @Size(max = 254) String email,
		@NotBlank @Size(min = 8, max = 72) String password, @NotBlank @Size(max = 120) String fullName,
		@Size(max = 30) @Pattern(regexp = "^\\+?[0-9 .-]{8,20}$", message = "must be a phone number") String phone) {
}
