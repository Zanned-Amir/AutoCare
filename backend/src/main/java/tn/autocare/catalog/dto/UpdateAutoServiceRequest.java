package tn.autocare.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateAutoServiceRequest(@NotBlank @Size(max = 120) String name, @Size(max = 1000) String description,
		@NotNull Boolean active, @Pattern(regexp = "^[a-z0-9-]{1,40}$", message = "must be an icon key") String icon) {
}
