package tn.autocare.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record DeactivateAccountRequest(@NotBlank String currentPassword) {
}
