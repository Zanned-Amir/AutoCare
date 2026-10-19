package tn.autocare.organization.api;

import org.jspecify.annotations.Nullable;

/**
 * A member was added, changed or removed, by a manager of the organization or by an
 * admin. {@code value}: the new role key or status, empty for a removal or a custom
 * permission set.
 */
public record OrganizationMemberChanged(Long organizationId, Long memberUserId, Long changedBy, Change change,
		@Nullable String value) {

	public enum Change {

		ADDED, ROLE_CHANGED, PERMISSIONS_CHANGED, STATUS_CHANGED, REMOVED

	}

}
