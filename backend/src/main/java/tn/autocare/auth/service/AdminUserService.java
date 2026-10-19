package tn.autocare.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.RoleNames;
import tn.autocare.auth.api.UserInvited;
import tn.autocare.auth.api.UserRegistered;
import tn.autocare.auth.api.UserRolesChanged;
import tn.autocare.auth.api.UserSuspended;
import tn.autocare.auth.api.UserUnsuspended;
import tn.autocare.auth.dto.AdminUserResponse;
import tn.autocare.auth.dto.CreateUserRequest;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.AuthTokenType;
import tn.autocare.auth.entity.RevokeReason;
import tn.autocare.auth.entity.Role;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.entity.UserRole;
import tn.autocare.auth.repository.RefreshTokenRepository;
import tn.autocare.auth.repository.RoleRepository;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.auth.repository.UserRoleRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/** Backoffice user management: search, detail, invitations, suspend, platform roles. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminUserService {

	/** The invitation is a password-reset link that lasts longer than a reset. */
	static final Duration INVITATION_VALIDITY = Duration.ofDays(3);

	private final UserRepository userRepository;

	private final RoleRepository roleRepository;

	private final UserRoleRepository userRoleRepository;

	private final RefreshTokenRepository refreshTokenRepository;

	private final UserService userService;

	private final AccountTokenService accountTokenService;

	private final TokenService tokenService;

	private final AuthMails authMails;

	private final PasswordEncoder passwordEncoder;

	private final ApplicationEventPublisher events;

	/**
	 * {@code query} matches the e-mail, the name or the phone; {@code role} keeps users
	 * holding that platform role; {@code active} false lists suspended accounts.
	 */
	public Page<AdminUserResponse> searchUsers(@Nullable String query, @Nullable String role, @Nullable Boolean active,
			Pageable pageable) {
		Specification<User> filters = (root, criteria, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (StringUtils.hasText(query)) {
				String like = "%" + query.trim().toLowerCase() + "%";
				predicates.add(cb.or(cb.like(cb.lower(root.get("email")), like),
						cb.like(cb.lower(root.get("fullName")), like), cb.like(root.get("phone"), like)));
			}
			if (active != null) {
				predicates.add(cb.equal(root.get("active"), active));
			}
			if (StringUtils.hasText(role)) {
				Subquery<Long> holders = criteria.subquery(Long.class);
				var link = holders.from(UserRole.class);
				var granted = holders.from(Role.class);
				holders.select(link.get("userId"))
					.where(cb.equal(link.get("roleId"), granted.get("id")), cb.equal(granted.get("name"), role));
				predicates.add(root.get("id").in(holders));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
		return userRepository.findAll(filters, pageable).map(this::toResponse);
	}

	public AdminUserResponse getUser(Long userId) {
		return toResponse(findUser(userId));
	}

	/**
	 * Opens an account with a random password nobody knows and e-mails a link to choose
	 * one. Choosing it also confirms the address.
	 */
	@Transactional
	public AdminUserResponse createUser(Long adminId, CreateUserRequest request) {
		if (userRepository.existsByEmailIgnoreCase(request.email().trim())) {
			throw new AppException(ErrorCode.EMAIL_TAKEN, "An account already exists with this email");
		}
		List<Role> roles = findRoles(
				request.roles() == null || request.roles().isEmpty() ? List.of(RoleNames.USER) : request.roles());
		User user = User.register(request.email(), passwordEncoder.encode(tokenService.generateOpaqueToken()),
				request.fullName(), request.phone(),
				Locale.forLanguageTag(request.locale() == null ? "fr" : request.locale()));
		user.markPasswordNotSet();
		User saved = userRepository.save(user);
		roles.forEach(role -> userRoleRepository.save(UserRole.assign(saved.getId(), role.getId())));
		events.publishEvent(new UserRegistered(saved.getId(), saved.getEmail(), saved.getFullName()));
		events.publishEvent(new UserInvited(saved.getId(), adminId));
		sendInvitation(saved);
		return toResponse(saved);
	}

	/**
	 * Sends a fresh link (the previous one stops working) while no password is chosen.
	 */
	@Transactional
	public AdminUserResponse resendUserInvitation(Long userId) {
		User user = findUser(userId);
		if (user.isPasswordSet()) {
			throw new AppException(ErrorCode.USER_PASSWORD_ALREADY_SET, "This person already chose a password");
		}
		accountTokenService.checkSendCooldown(userId, AuthTokenType.PASSWORD_RESET);
		sendInvitation(user);
		return toResponse(user);
	}

	public List<String> listRoleNames() {
		return roleRepository.findAll().stream().map(Role::getName).sorted().toList();
	}

	/** Suspended users cannot sign in, and every session they have is revoked. */
	@Transactional
	public AdminUserResponse suspendUser(Long adminId, Long userId) {
		if (adminId.equals(userId)) {
			throw new AppException(ErrorCode.ADMIN_SELF_LOCKOUT, "You cannot suspend your own account");
		}
		User user = findUser(userId);
		user.deactivate();
		refreshTokenRepository.revokeAllByUserId(userId, Instant.now(), RevokeReason.ACCOUNT_DISABLED);
		events.publishEvent(new UserSuspended(userId, adminId));
		return toResponse(user);
	}

	@Transactional
	public AdminUserResponse unsuspendUser(Long adminId, Long userId) {
		User user = findUser(userId);
		user.activate();
		events.publishEvent(new UserUnsuspended(userId, adminId));
		return toResponse(user);
	}

	/** Replaces the user's platform roles. Takes effect at their next token refresh. */
	@Transactional
	public AdminUserResponse setUserRoles(Long adminId, Long userId, List<String> roleNames) {
		User user = findUser(userId);
		List<Role> roles = findRoles(roleNames);
		if (adminId.equals(userId) && roles.stream().noneMatch(role -> role.getName().equals(RoleNames.ADMIN))) {
			throw new AppException(ErrorCode.ADMIN_SELF_LOCKOUT, "You cannot remove your own admin role");
		}
		userRoleRepository.deleteAll(userRoleRepository.findAllByUserId(userId));
		userRoleRepository.flush();
		roles.forEach(role -> userRoleRepository.save(UserRole.assign(userId, role.getId())));
		events.publishEvent(new UserRolesChanged(userId, adminId, roles.stream().map(Role::getName).sorted().toList()));
		return toResponse(user);
	}

	private void sendInvitation(User user) {
		String token = accountTokenService.issueToken(user.getId(), AuthTokenType.PASSWORD_RESET, AuthTokenChannel.LINK,
				INVITATION_VALIDITY, null);
		authMails.sendAccountInvitation(user, token, INVITATION_VALIDITY);
	}

	private List<Role> findRoles(List<String> roleNames) {
		return roleNames.stream()
			.distinct()
			.map(name -> roleRepository.findByName(name)
				.orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_FOUND, "Unknown role " + name)))
			.toList();
	}

	private AdminUserResponse toResponse(User user) {
		UserAccess access = userService.loadUserAccess(user);
		return new AdminUserResponse(user.getId(), user.getEmail(), user.getFullName(), user.getPhone(),
				user.isActive(), user.isEmailVerified(), user.isPasswordSet(), access.roles(), user.getCreatedAt());
	}

	private User findUser(Long userId) {
		return userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
	}

}
