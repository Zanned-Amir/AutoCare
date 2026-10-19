package tn.autocare.auth.service;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.security.PermissionMatcher;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class AuthFacadeImpl implements AuthFacade {

	private final UserRepository userRepository;

	private final UserService userService;

	@Override
	public Optional<UserSummary> findUser(Long userId) {
		return userRepository.findById(userId).map(AuthFacadeImpl::toSummary);
	}

	@Override
	public UserSummary getUser(Long userId) {
		return findUser(userId).orElseThrow(() -> AppException.notFound("User", userId));
	}

	@Override
	public Optional<UserSummary> findUserByEmail(String email) {
		return userRepository.findByEmailIgnoreCase(email.trim()).map(AuthFacadeImpl::toSummary);
	}

	@Override
	public List<UserSummary> listUsers(Collection<Long> userIds) {
		return userRepository.findAllById(userIds).stream().map(AuthFacadeImpl::toSummary).toList();
	}

	@Override
	public boolean hasPlatformPermission(Long userId, String permission) {
		return PermissionMatcher.grants(userService.loadUserAccess(userId).permissions(), permission);
	}

	private static UserSummary toSummary(User user) {
		return new UserSummary(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(), user.isActive(),
				user.getLocale());
	}

}
