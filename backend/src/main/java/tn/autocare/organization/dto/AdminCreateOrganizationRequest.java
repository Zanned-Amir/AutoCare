package tn.autocare.organization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * An admin opens an organization for someone who already has an account (a garage signed
 * up by phone, for example). {@code approve} skips the review queue.
 */
public record AdminCreateOrganizationRequest(@NotBlank @Email String ownerEmail, boolean approve,
		@NotNull @Valid CreateOrganizationRequest organization) {
}
