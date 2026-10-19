package tn.autocare.auth.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.MeResponse;
import tn.autocare.auth.entity.Role;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.RoleRepository;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.shared.exception.AppException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

	private final UserRepository userRepository;

	private final RoleRepository roleRepository;

	public MeResponse getMe(Long userId) {
		return toMeResponse(loadUserAccess(userId));
	}

	UserAccess loadUserAccess(Long userId) {
		User user = userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
		return loadUserAccess(user);
	}

	UserAccess loadUserAccess(User user) {
		List<Role> roles = roleRepository.findAllByUserId(user.getId());
		List<String> roleNames = roles.stream().map(Role::getName).toList();
		List<String> permissions = roles.stream()
			.flatMap(r -> r.getPermissions().stream())
			.distinct()
			.sorted()
			.toList();
		return new UserAccess(user, roleNames, permissions, roles.stream().anyMatch(Role::isBackoffice));
	}

	static MeResponse toMeResponse(UserAccess access) {
		User user = access.user();
		return new MeResponse(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.getLocale(),
				user.isEmailVerified(), user.isPhoneVerified(), user.isPasswordSet(), user.isOnboardingDone(),
				access.roles(), access.permissions());
	}

}
