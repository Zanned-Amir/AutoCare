package tn.autocare.auth.api;

/** {@code locale}: "fr" or "en", the language to write to this user in. */
public record UserSummary(Long id, String email, String fullName, String phone, boolean active, String locale) {
}
