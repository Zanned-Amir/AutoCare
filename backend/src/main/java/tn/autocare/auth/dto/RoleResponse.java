package tn.autocare.auth.dto;

import java.time.Instant;
import java.util.List;

/** {@code memberCount}: accounts holding the role. */
public record RoleResponse(Long id, String name, String label, String description, List<String> permissions,
		boolean backoffice, boolean system, long memberCount, Instant createdAt) {
}
