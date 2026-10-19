package tn.autocare.auth.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import tn.autocare.auth.dto.RoleResponse;
import tn.autocare.auth.dto.SaveRoleRequest;
import tn.autocare.auth.service.RoleService;
import tn.autocare.shared.security.CurrentUser;

/** Platform roles and their permissions (backoffice "Rôles & permissions"). */
@Tag(name = "Admin - Roles")
@RestController
@RequestMapping("/admin/roles")
@RequiredArgsConstructor
public class AdminRoleController {

	private final RoleService roleService;

	@GetMapping
	@PreAuthorize("@perm.has('" + AuthPermissions.ROLE_READ + "')")
	public List<RoleResponse> listRoles() {
		return roleService.listRoles();
	}

	@GetMapping("/{roleId}")
	@PreAuthorize("@perm.has('" + AuthPermissions.ROLE_READ + "')")
	public RoleResponse getRole(@PathVariable Long roleId) {
		return roleService.getRole(roleId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize("@perm.has('" + AuthPermissions.ROLE_MANAGE + "')")
	public RoleResponse createRole(@Valid @RequestBody SaveRoleRequest request) {
		return roleService.createRole(CurrentUser.id(), request);
	}

	@PutMapping("/{roleId}")
	@PreAuthorize("@perm.has('" + AuthPermissions.ROLE_MANAGE + "')")
	public RoleResponse updateRole(@PathVariable Long roleId, @Valid @RequestBody SaveRoleRequest request) {
		return roleService.updateRole(CurrentUser.id(), roleId, request);
	}

	@DeleteMapping("/{roleId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize("@perm.has('" + AuthPermissions.ROLE_MANAGE + "')")
	public void deleteRole(@PathVariable Long roleId, @RequestParam(required = false) Long replacementRoleId) {
		roleService.deleteRole(CurrentUser.id(), roleId, replacementRoleId);
	}

}
