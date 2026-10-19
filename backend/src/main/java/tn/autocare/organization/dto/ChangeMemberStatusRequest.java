package tn.autocare.organization.dto;

import jakarta.validation.constraints.NotNull;
import tn.autocare.organization.entity.MemberStatus;

public record ChangeMemberStatusRequest(@NotNull MemberStatus status) {
}
