package tn.autocare.organization.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import tn.autocare.organization.entity.MemberRoleKey;

/**
 * Adds a user who already has an account. People without an account are invited
 * (B-ORG-3).
 */
public record AddMemberRequest(@NotBlank @Email String email, @NotNull MemberRoleKey roleKey) {
}
