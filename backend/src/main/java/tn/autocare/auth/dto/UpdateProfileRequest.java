package tn.autocare.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** {@code locale} is optional ("fr" or "en"); when absent the saved language is kept. */
public record UpdateProfileRequest(@NotBlank @Size(max = 120) String fullName,
		@Size(max = 30) @Pattern(regexp = "^\\+?[0-9 .-]{8,20}$", message = "must be a phone number") String phone,
		@Pattern(regexp = "fr|en") String locale) {
}
