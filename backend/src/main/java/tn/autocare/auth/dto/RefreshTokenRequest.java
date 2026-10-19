package tn.autocare.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** Header mode (/auth/h/*): the refresh token travels in the body instead of a cookie. */
public record RefreshTokenRequest(@NotBlank String refreshToken) {
}
