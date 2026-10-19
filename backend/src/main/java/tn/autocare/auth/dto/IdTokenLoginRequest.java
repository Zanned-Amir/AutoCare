package tn.autocare.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** An ID token from Google Sign-In / Sign in with Apple (mobile SDK or web JS). */
public record IdTokenLoginRequest(@NotBlank String idToken) {
}
