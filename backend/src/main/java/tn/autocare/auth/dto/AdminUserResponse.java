package tn.autocare.auth.dto;

import java.time.Instant;
import java.util.List;

/**
 * {@code passwordSet} false: opened by an admin (or OAuth) and no password chosen yet.
 */
public record AdminUserResponse(Long id, String email, String fullName, String phone, boolean active,
		boolean emailVerified, boolean passwordSet, List<String> roles, Instant createdAt) {
}
