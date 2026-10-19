package tn.autocare.auth.dto;

import java.util.List;

/**
 * {@code locale}: "fr" or "en", the language of the user's e-mails. {@code passwordSet}:
 * false for an account created through OAuth that has no password yet.
 * {@code onboardingDone}: the welcome flow after sign-up was finished or skipped.
 */
public record MeResponse(Long id, String email, String fullName, String phone, String locale, boolean emailVerified,
		boolean phoneVerified, boolean passwordSet, boolean onboardingDone, List<String> roles,
		List<String> permissions) {
}
