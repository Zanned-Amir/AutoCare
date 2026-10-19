package tn.autocare.organization.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthPermissions;
import tn.autocare.organization.dto.UserMembershipResponse;
import tn.autocare.organization.service.OrganizationService;

/** The organizations one user belongs to, for the backoffice user page. */
@Tag(name = "Admin - Organizations")
@RestController
@RequiredArgsConstructor
public class AdminUserOrganizationController {

	private final OrganizationService organizationService;

	@GetMapping("/admin/users/{userId}/organizations")
	@PreAuthorize("@perm.has('" + AuthPermissions.USER_READ + "')")
	public List<UserMembershipResponse> listUserMemberships(@PathVariable Long userId) {
		return organizationService.listUserMemberships(userId);
	}

}
