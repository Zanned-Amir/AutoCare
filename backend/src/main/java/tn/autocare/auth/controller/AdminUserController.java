package tn.autocare.auth.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthPermissions;
import tn.autocare.auth.dto.AdminUserResponse;
import tn.autocare.auth.dto.CreateUserRequest;
import tn.autocare.auth.dto.SetUserRolesRequest;
import tn.autocare.auth.service.AdminUserService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Admin - Users")
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

	private static final String CAN_READ = "@perm.has('" + AuthPermissions.USER_READ + "')";

	private static final String CAN_MANAGE = "@perm.has('" + AuthPermissions.USER_MANAGE + "')";

	private final AdminUserService adminUserService;

	@GetMapping
	@PreAuthorize(CAN_READ)
	public PagedModel<AdminUserResponse> searchUsers(@RequestParam(required = false) String q,
			@RequestParam(required = false) String role, @RequestParam(required = false) Boolean active,
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(adminUserService.searchUsers(q, role, active, pageable));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_MANAGE)
	public AdminUserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
		return adminUserService.createUser(CurrentUser.id(), request);
	}

	@GetMapping("/roles")
	@PreAuthorize(CAN_READ)
	public List<String> listRoleNames() {
		return adminUserService.listRoleNames();
	}

	@GetMapping("/{userId}")
	@PreAuthorize(CAN_READ)
	public AdminUserResponse getUser(@PathVariable Long userId) {
		return adminUserService.getUser(userId);
	}

	@PostMapping("/{userId}/invitation")
	@PreAuthorize(CAN_MANAGE)
	public AdminUserResponse resendUserInvitation(@PathVariable Long userId) {
		return adminUserService.resendUserInvitation(userId);
	}

	@PostMapping("/{userId}/suspend")
	@PreAuthorize(CAN_MANAGE)
	public AdminUserResponse suspendUser(@PathVariable Long userId) {
		return adminUserService.suspendUser(CurrentUser.id(), userId);
	}

	@PostMapping("/{userId}/unsuspend")
	@PreAuthorize(CAN_MANAGE)
	public AdminUserResponse unsuspendUser(@PathVariable Long userId) {
		return adminUserService.unsuspendUser(CurrentUser.id(), userId);
	}

	@PutMapping("/{userId}/roles")
	@PreAuthorize(CAN_MANAGE)
	public AdminUserResponse setUserRoles(@PathVariable Long userId, @Valid @RequestBody SetUserRolesRequest request) {
		return adminUserService.setUserRoles(CurrentUser.id(), userId, request.roles());
	}

}
