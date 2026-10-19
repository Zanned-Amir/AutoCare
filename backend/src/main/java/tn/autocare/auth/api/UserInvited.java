package tn.autocare.auth.api;

/** An admin opened an account and sent its invitation e-mail. */
public record UserInvited(Long userId, Long invitedBy) {
}
