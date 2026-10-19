package tn.autocare.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code currentPassword} may be empty only for an OAuth account that has no password
 * yet.
 */
public record ChangePasswordRequest(String currentPassword, @NotBlank @Size(min = 8, max = 72) String newPassword) {
}
