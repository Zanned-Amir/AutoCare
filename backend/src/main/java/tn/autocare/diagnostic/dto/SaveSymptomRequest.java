package tn.autocare.diagnostic.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SaveSymptomRequest(@NotBlank @Size(max = 120) String label, @Size(max = 500) String description,
		@NotNull @Min(0) Integer position, @NotNull Boolean active) {
}
