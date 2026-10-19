package tn.autocare.organization.service;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.shared.security.PermissionMatcher;

/**
 * Organization permission check for controllers:
 * {@code @PreAuthorize("@orgPerm.has(#organizationId, 'member:manage')")}.
 */
@Component("orgPerm")
@RequiredArgsConstructor
public class OrganizationPermissionChecker {

	private final MemberPermissionCache memberPermissionCache;

	public boolean has(Long organizationId, String permission) {
		return CurrentUser.findId()
			.map(userId -> PermissionMatcher.grants(memberPermissionCache.getPermissions(organizationId, userId),
					permission))
			.orElse(false);
	}

}
