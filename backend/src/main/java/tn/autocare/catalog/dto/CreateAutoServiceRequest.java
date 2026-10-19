package tn.autocare.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** {@code icon}: an icon key from the apps' set ("droplet", "disc"…), optional. */
public record CreateAutoServiceRequest(@NotBlank @Size(max = 120) String name, @Size(max = 1000) String description,
		@Pattern(regexp = "^[a-z0-9-]{1,40}$", message = "must be an icon key") String icon) {
}
