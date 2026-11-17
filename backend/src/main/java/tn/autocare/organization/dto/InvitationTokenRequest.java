package tn.autocare.organization.dto;

import jakarta.validation.constraints.NotBlank;

/** The token of the invitation link, in the body to keep it out of URLs and logs. */
public record InvitationTokenRequest(@NotBlank String token) {
}
