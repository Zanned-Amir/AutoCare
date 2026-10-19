package tn.autocare.organization.dto;

import jakarta.validation.constraints.NotNull;
import tn.autocare.organization.entity.MemberRoleKey;

public record ChangeMemberRoleRequest(@NotNull MemberRoleKey roleKey) {
}
