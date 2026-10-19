package tn.autocare.auth.api;

import java.util.List;

/**
 * A platform role was created, edited or deleted from the backoffice ({@code action}:
 * CREATED, UPDATED, DELETED). {@code permissions} is the new list (empty when deleted).
 */
public record RoleChanged(Long roleId, String name, String action, List<String> permissions, Long changedBy) {
}
