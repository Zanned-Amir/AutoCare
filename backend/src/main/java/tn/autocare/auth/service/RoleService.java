package tn.autocare.auth.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.RoleChanged;
import tn.autocare.auth.api.RoleNames;
import tn.autocare.auth.dto.RoleResponse;
import tn.autocare.auth.dto.SaveRoleRequest;
import tn.autocare.auth.entity.Role;
import tn.autocare.auth.entity.UserRole;
import tn.autocare.auth.repository.RoleRepository;
import tn.autocare.auth.repository.UserRoleRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Platform roles edited from the backoffice. Changes reach a user's token at their next
 * refresh (at most 15 minutes). System roles keep their name; ADMIN keeps {@code *:*} and
 * USER stays a customer role, so nobody can lock the platform out.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoleService {

	private static final String ALL = "*:*";

	private final RoleRepository roleRepository;

	private final UserRoleRepository userRoleRepository;

	private final ApplicationEventPublisher events;

	public List<RoleResponse> listRoles() {
		Map<Long, Long> counts = memberCounts();
		return roleRepository.findAll()
			.stream()
			.sorted((a, b) -> a.isSystem() == b.isSystem() ? a.getLabel().compareToIgnoreCase(b.getLabel())
					: a.isSystem() ? -1 : 1)
			.map(role -> toResponse(role, counts.getOrDefault(role.getId(), 0L)))
			.toList();
	}

	public RoleResponse getRole(Long roleId) {
		return toResponse(find(roleId), memberCounts().getOrDefault(roleId, 0L));
	}

	@Transactional
	public RoleResponse createRole(Long adminId, SaveRoleRequest request) {
		if (roleRepository.findByName(request.name()).isPresent()) {
			throw new AppException(ErrorCode.ROLE_NAME_TAKEN, "Role " + request.name() + " exists");
		}
		Role role = roleRepository.save(Role.create(request.name(), request.label(), request.description(),
				request.permissions(), request.backoffice()));
		events.publishEvent(new RoleChanged(role.getId(), role.getName(), "CREATED", role.getPermissions(), adminId));
		return toResponse(role, 0);
	}

	@Transactional
	public RoleResponse updateRole(Long adminId, Long roleId, SaveRoleRequest request) {
		Role role = find(roleId);
		if (!role.getName().equals(request.name())) {
			throw new AppException(ErrorCode.ROLE_SYSTEM_LOCKED, "A role keeps its name");
		}
		boolean adminLosesAll = RoleNames.ADMIN.equals(role.getName())
				&& (!request.permissions().contains(ALL) || !request.backoffice());
		boolean userBecomesStaff = RoleNames.USER.equals(role.getName()) && request.backoffice();
		if (adminLosesAll || userBecomesStaff) {
			throw new AppException(ErrorCode.ROLE_SYSTEM_LOCKED, "This system role cannot change that way");
		}
		role.update(request.label(), request.description(), request.permissions(), request.backoffice());
		events.publishEvent(new RoleChanged(role.getId(), role.getName(), "UPDATED", role.getPermissions(), adminId));
		return getRole(roleId);
	}

	/**
	 * Users holding the role move to {@code replacementRoleId}, required when there are
	 * any.
	 */
	@Transactional
	public void deleteRole(Long adminId, Long roleId, @Nullable Long replacementRoleId) {
		Role role = find(roleId);
		if (role.isSystem()) {
			throw new AppException(ErrorCode.ROLE_SYSTEM_LOCKED, "System roles cannot be deleted");
		}
		List<UserRole> holders = userRoleRepository.findAllByRoleId(roleId);
		if (!holders.isEmpty()) {
			if (replacementRoleId == null || replacementRoleId.equals(roleId)) {
				throw new AppException(ErrorCode.ROLE_IN_USE, "Choose a role for its members");
			}
			Role replacement = find(replacementRoleId);
			for (UserRole holder : holders) {
				if (!userRoleRepository.existsByUserIdAndRoleId(holder.getUserId(), replacement.getId())) {
					userRoleRepository.save(UserRole.assign(holder.getUserId(), replacement.getId()));
				}
			}
			userRoleRepository.deleteAll(holders);
		}
		roleRepository.delete(role);
		events.publishEvent(new RoleChanged(roleId, role.getName(), "DELETED", List.of(), adminId));
	}

	private Map<Long, Long> memberCounts() {
		Map<Long, Long> counts = new HashMap<>();
		for (Object[] row : userRoleRepository.countUsersByRole()) {
			counts.put((Long) row[0], (Long) row[1]);
		}
		return counts;
	}

	private Role find(Long roleId) {
		return roleRepository.findById(roleId).orElseThrow(() -> AppException.notFound("Role", roleId));
	}

	private static RoleResponse toResponse(Role role, long memberCount) {
		return new RoleResponse(role.getId(), role.getName(), role.getLabel(), role.getDescription(),
				role.getPermissions(), role.isBackoffice(), role.isSystem(), memberCount, role.getCreatedAt());
	}

}
