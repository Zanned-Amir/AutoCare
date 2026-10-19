package tn.autocare.auth.api;

/** Published after a user registers. */
public record UserRegistered(Long userId, String email, String fullName) {
}
