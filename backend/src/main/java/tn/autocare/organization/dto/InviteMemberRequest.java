package tn.autocare.organization.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tn.autocare.organization.entity.MemberRoleKey;

/** Invites someone by e-mail, with or without an account. */
public record InviteMemberRequest(@NotBlank @Email String email, @NotNull MemberRoleKey roleKey) {
}
