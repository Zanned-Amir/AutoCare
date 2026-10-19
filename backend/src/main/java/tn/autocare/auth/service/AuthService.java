package tn.autocare.auth.service;

import java.time.Duration;
import java.time.Instant;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.auth.api.RoleNames;
import tn.autocare.auth.api.UserRegistered;
import tn.autocare.auth.dto.AuthResponse;
import tn.autocare.auth.dto.LoginRequest;
import tn.autocare.auth.dto.RegisterRequest;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.RefreshToken;
import tn.autocare.auth.entity.RevokeReason;
import tn.autocare.auth.entity.Role;
import tn.autocare.auth.entity.SessionScope;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.entity.UserRole;
import tn.autocare.auth.repository.RefreshTokenRepository;
import tn.autocare.auth.repository.RoleRepository;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.auth.repository.UserRoleRepository;
import tn.autocare.shared.security.JwtProperties;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.ratelimit.RequestLimiter;

/**
 * Register, login, refresh and logout. Account flows live in the other services of this
 * package.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

	static final int MAX_LOGIN_FAILURES = 5;

	static final Duration LOGIN_FAILURE_WINDOW = Duration.ofMinutes(15);

	private final UserRepository userRepository;

	private final RoleRepository roleRepository;

	private final UserRoleRepository userRoleRepository;

	private final RefreshTokenRepository refreshTokenRepository;

	private final UserService userService;

	private final TokenService tokenService;

	private final EmailVerificationService emailVerificationService;

	private final AuthMails authMails;

	private final RequestLimiter requestLimiter;

	private final PasswordEncoder passwordEncoder;

	private final ApplicationEventPublisher events;

	private final JwtProperties jwt;

	@Transactional
	public AuthSession registerUser(RegisterRequest request, ClientInfo client) {
		if (userRepository.existsByEmailIgnoreCase(request.email().trim())) {
			throw new AppException(ErrorCode.EMAIL_TAKEN, "An account already exists with this email");
		}
		User user = userRepository.save(User.register(request.email(), passwordEncoder.encode(request.password()),
				request.fullName(), request.phone(), LocaleContextHolder.getLocale()));
		assignRole(user.getId(), RoleNames.USER);
		events.publishEvent(new UserRegistered(user.getId(), user.getEmail(), user.getFullName()));
		emailVerificationService.sendVerificationAfterRegistration(user, AuthTokenChannel.LINK);
		return startSession(userService.loadUserAccess(user), client, Instant.now(), SessionScope.CUSTOMER);
	}

	/** Five wrong passwords for one e-mail lock it for 15 minutes. */
	@Transactional
	public AuthSession loginUser(LoginRequest request, ClientInfo client) {
		String email = User.normalizeEmail(request.email());
		String limitKey = "login:" + email;
		if (requestLimiter.isBlocked(limitKey, MAX_LOGIN_FAILURES)) {
			throw AppException.tooSoon(ErrorCode.TOO_MANY_LOGIN_ATTEMPTS, "Too many failed attempts",
					requestLimiter.secondsUntilReset(limitKey));
		}
		User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
		if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
			requestLimiter.recordFailure(limitKey, LOGIN_FAILURE_WINDOW);
			throw new AppException(ErrorCode.INVALID_CREDENTIALS, "Email or password is incorrect");
		}
		if (!user.isActive()) {
			throw new AppException(ErrorCode.ACCOUNT_DISABLED, "This account is disabled");
		}
		requestLimiter.reset(limitKey);
		SessionScope scope = "backoffice".equals(request.scope()) ? SessionScope.BACKOFFICE : SessionScope.CUSTOMER;
		UserAccess access = userService.loadUserAccess(user);
		if (scope == SessionScope.BACKOFFICE && !access.backoffice()) {
			throw new AppException(ErrorCode.NOT_BACKOFFICE_USER, "This account has no backoffice access");
		}
		AuthSession session = startSession(access, client, Instant.now(), scope);
		alertIfNewDevice(user, session.sessionId(), client);
		return session;
	}

	/**
	 * Rotates the refresh token. A token rotated less than 10 s ago is a concurrent
	 * refresh (two tabs) and gets a fresh session; an older rotated token means it
	 * leaked, so every session is revoked.
	 */
	@Transactional(noRollbackFor = AppException.class)
	public AuthSession refreshSession(@Nullable String rawRefreshToken, ClientInfo client) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			throw invalidRefreshToken();
		}
		Instant now = Instant.now();
		RefreshToken current = refreshTokenRepository.findByTokenHash(tokenService.hash(rawRefreshToken))
			.orElseThrow(AuthService::invalidRefreshToken);
		if (!current.isUsable(now)) {
			if (current.isWithinRotationGrace(now)) {
				return startSession(userService.loadUserAccess(current.getUserId()), client,
						current.getSessionStartedAt(), current.getScope());
			}
			if (current.getRevokeReason() == RevokeReason.ROTATED) {
				log.warn("Refresh token reuse detected for user {}, revoking all sessions", current.getUserId());
				refreshTokenRepository.revokeAllByUserId(current.getUserId(), now, RevokeReason.REUSE_DETECTED);
			}
			throw invalidRefreshToken();
		}
		UserAccess access = userService.loadUserAccess(current.getUserId());
		if (!access.user().isActive()) {
			current.revoke(now, RevokeReason.ACCOUNT_DISABLED);
			throw new AppException(ErrorCode.ACCOUNT_DISABLED, "This account is disabled");
		}
		// Losing the staff role ends backoffice sessions at the next refresh.
		if (current.getScope() == SessionScope.BACKOFFICE && !access.backoffice()) {
			current.revoke(now, RevokeReason.ACCOUNT_DISABLED);
			throw new AppException(ErrorCode.NOT_BACKOFFICE_USER, "This account has no backoffice access");
		}
		current.revoke(now, RevokeReason.ROTATED);
		return startSession(access, client, current.getSessionStartedAt(), current.getScope());
	}

	@Transactional
	public void logoutUser(@Nullable String rawRefreshToken) {
		if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
			return;
		}
		refreshTokenRepository.findByTokenHash(tokenService.hash(rawRefreshToken))
			.ifPresent(token -> token.revoke(Instant.now(), RevokeReason.LOGOUT));
	}

	@Transactional
	public void logoutUserEverywhere(Long userId) {
		refreshTokenRepository.revokeAllByUserId(userId, Instant.now(), RevokeReason.LOGOUT_ALL);
	}

	/** Starts a session for a user authenticated elsewhere (OAuth). */
	@Transactional
	public AuthSession startSessionForUser(User user, ClientInfo client, SessionScope scope) {
		if (!user.isActive()) {
			throw new AppException(ErrorCode.ACCOUNT_DISABLED, "This account is disabled");
		}
		UserAccess access = userService.loadUserAccess(user);
		if (scope == SessionScope.BACKOFFICE && !access.backoffice()) {
			throw new AppException(ErrorCode.NOT_BACKOFFICE_USER, "This account has no backoffice access");
		}
		AuthSession session = startSession(access, client, Instant.now(), scope);
		alertIfNewDevice(user, session.sessionId(), client);
		return session;
	}

	@Transactional
	public void assignRole(Long userId, String roleName) {
		Role role = roleRepository.findByName(roleName)
			.orElseThrow(() -> new IllegalStateException("Role " + roleName + " is not seeded"));
		if (!userRoleRepository.existsByUserIdAndRoleId(userId, role.getId())) {
			userRoleRepository.save(UserRole.assign(userId, role.getId()));
		}
	}

	private AuthSession startSession(UserAccess access, ClientInfo client, Instant sessionStartedAt,
			SessionScope scope) {
		Instant now = Instant.now();
		String rawRefreshToken = tokenService.generateOpaqueToken();
		Instant refreshExpiresAt = now
			.plus(scope == SessionScope.BACKOFFICE ? jwt.backofficeRefreshTokenTtl() : jwt.refreshTokenTtl());
		RefreshToken session = refreshTokenRepository
			.save(RefreshToken.issue(access.user().getId(), tokenService.hash(rawRefreshToken), refreshExpiresAt,
					client.userAgent(), client.ipAddress(), sessionStartedAt, scope));
		TokenService.AccessToken accessToken = tokenService.issueAccessToken(access, session.getId(), scope, now);
		AuthResponse response = new AuthResponse(accessToken.value(), accessToken.expiresAt(),
				UserService.toMeResponse(access));
		return new AuthSession(response, rawRefreshToken, refreshExpiresAt, session.getId(), scope);
	}

	/**
	 * A device is new when no other session of this user ever came from the same browser.
	 */
	private void alertIfNewDevice(User user, Long sessionId, ClientInfo client) {
		if (client.userAgent() == null) {
			return;
		}
		if (!refreshTokenRepository.existsByUserIdAndUserAgentAndIdNot(user.getId(), client.userAgent(), sessionId)) {
			authMails.sendNewDeviceLogin(user, DeviceLabel.of(client.userAgent()), client.ipAddress());
		}
	}

	private static AppException invalidRefreshToken() {
		return new AppException(ErrorCode.INVALID_REFRESH_TOKEN, "Session expired, please sign in again");
	}

}
