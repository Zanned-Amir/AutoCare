package tn.autocare.auth.service;

import java.time.Duration;
import java.time.Instant;

import org.jspecify.annotations.Nullable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.ChangePasswordRequest;
import tn.autocare.auth.dto.FinishOnboardingRequest;
import tn.autocare.auth.dto.MeResponse;
import tn.autocare.auth.dto.RequestEmailChangeRequest;
import tn.autocare.auth.dto.SentResponse;
import tn.autocare.auth.dto.UpdateProfileRequest;
import tn.autocare.auth.entity.AuthToken;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.AuthTokenType;
import tn.autocare.auth.entity.RevokeReason;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.RefreshTokenRepository;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.i18n.SupportedLocales;

/** The signed-in user's own account: profile, password, e-mail, deactivation. */
@Service
@RequiredArgsConstructor
public class AccountService {

	static final Duration EMAIL_CHANGE_VALIDITY = Duration.ofMinutes(15);

	private final UserRepository userRepository;

	private final RefreshTokenRepository refreshTokenRepository;

	private final UserService userService;

	private final AccountTokenService accountTokenService;

	private final AuthMails authMails;

	private final PasswordEncoder passwordEncoder;

	@Transactional
	public MeResponse updateProfile(Long userId, UpdateProfileRequest request) {
		User user = findUser(userId);
		user.updateProfile(request.fullName(), request.phone());
		if (request.locale() != null) {
			user.changeLocale(SupportedLocales.fromTag(request.locale()));
		}
		return UserService.toMeResponse(userService.loadUserAccess(user));
	}

	@Transactional
	public MeResponse finishOnboarding(Long userId, FinishOnboardingRequest request) {
		User user = findUser(userId);
		user.finishOnboarding(request.skipped(), Instant.now());
		return UserService.toMeResponse(userService.loadUserAccess(user));
	}

	/** Keeps the current session and signs out every other device. */
	@Transactional
	public void changePassword(Long userId, @Nullable Long currentSessionId, ChangePasswordRequest request) {
		User user = findUser(userId);
		if (user.isPasswordSet()) {
			checkPassword(user, request.currentPassword());
		}
		user.changePassword(passwordEncoder.encode(request.newPassword()));
		Instant now = Instant.now();
		if (currentSessionId == null) {
			refreshTokenRepository.revokeAllByUserId(userId, now, RevokeReason.PASSWORD_CHANGED);
		}
		else {
			refreshTokenRepository.revokeAllByUserIdExcept(userId, currentSessionId, now,
					RevokeReason.PASSWORD_CHANGED);
		}
		authMails.sendPasswordChanged(user);
	}

	/**
	 * Sends a confirmation link to the new address; the e-mail changes only when it is
	 * clicked.
	 */
	@Transactional
	public SentResponse requestEmailChange(Long userId, RequestEmailChangeRequest request) {
		User user = findUser(userId);
		checkPassword(user, request.currentPassword());
		String newEmail = User.normalizeEmail(request.newEmail());
		if (userRepository.existsByEmailIgnoreCase(newEmail)) {
			throw new AppException(ErrorCode.EMAIL_TAKEN, "An account already exists with this email");
		}
		accountTokenService.checkSendCooldown(userId, AuthTokenType.EMAIL_CHANGE);
		String token = accountTokenService.issueToken(userId, AuthTokenType.EMAIL_CHANGE, AuthTokenChannel.LINK,
				EMAIL_CHANGE_VALIDITY, newEmail);
		authMails.sendEmailChange(user, newEmail, token, EMAIL_CHANGE_VALIDITY);
		return new SentResponse(AccountTokenService.SEND_COOLDOWN.toSeconds());
	}

	@Transactional
	public void confirmEmailChange(String token) {
		AuthToken authToken = accountTokenService.consumeLinkToken(token, AuthTokenType.EMAIL_CHANGE);
		// Someone may have registered the address since the link was sent.
		if (userRepository.existsByEmailIgnoreCase(authToken.getTargetEmail())) {
			throw new AppException(ErrorCode.EMAIL_TAKEN, "An account already exists with this email");
		}
		User user = findUser(authToken.getUserId());
		String previousEmail = user.getEmail();
		user.changeEmail(authToken.getTargetEmail());
		// Both addresses hear about it, so a hijacked account is noticed by its real
		// owner.
		authMails.sendEmailChanged(user, previousEmail);
	}

	@Transactional
	public void deactivateAccount(Long userId, String currentPassword) {
		User user = findUser(userId);
		checkPassword(user, currentPassword);
		user.deactivate();
		refreshTokenRepository.revokeAllByUserId(userId, Instant.now(), RevokeReason.ACCOUNT_DISABLED);
	}

	private void checkPassword(User user, String password) {
		if (password == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
			throw new AppException(ErrorCode.INVALID_CURRENT_PASSWORD, "The current password is wrong");
		}
	}

	private User findUser(Long userId) {
		return userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
	}

}
