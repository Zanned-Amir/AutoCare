package tn.autocare.organization.dto;

import java.time.Instant;
import java.util.List;

import tn.autocare.organization.entity.MemberRoleKey;
import tn.autocare.organization.entity.MemberStatus;

public record MemberResponse(Long id, Long userId, String fullName, String email, MemberStatus status,
		MemberRoleKey roleKey, List<String> permissions, Instant joinedAt) {
}
