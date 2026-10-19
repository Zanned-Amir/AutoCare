package tn.autocare.auth.service;

import java.time.Duration;
import java.time.Instant;

import java.util.List;

import org.springframework.context.MessageSource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.AuthChannel;
import tn.autocare.auth.dto.SentResponse;
import tn.autocare.auth.entity.AuthToken;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.AuthTokenType;
import tn.autocare.auth.entity.RevokeReason;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.RefreshTokenRepository;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.sms.SmsMessage;
import tn.autocare.shared.sms.SmsService;
import tn.autocare.telegram.api.TelegramFacade;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

	static final Duration VALIDITY = Duration.ofMinutes(15);

	private final UserRepository userRepository;

	private final RefreshTokenRepository refreshTokenRepository;

	private final AccountTokenService accountTokenService;

	private final AuthMails authMails;

	private final PasswordEncoder passwordEncoder;

	private final SmsService smsService;

	private final TelegramFacade telegramFacade;

	private final MessageSource messageSource;

	/**
	 * Same answer whether or not the e-mail has an account, so the form cannot be used to
	 * find out who is registered.
	 */
	@Transactional
	public SentResponse requestPasswordReset(String email, AuthChannel channel) {
		userRepository.findByEmailIgnoreCase(User.normalizeEmail(email)).filter(User::isActive).ifPresent(user -> {
			accountTokenService.checkSendCooldown(user.getId(), AuthTokenType.PASSWORD_RESET);
			AuthTokenChannel tokenChannel = channel == null || channel == AuthChannel.LINK ? AuthTokenChannel.LINK
					: AuthTokenChannel.OTP;
			String token = accountTokenService.issueToken(user.getId(), AuthTokenType.PASSWORD_RESET, tokenChannel,
					VALIDITY, null);
			deliverResetToken(user, channel, tokenChannel, token);
		});
		return new SentResponse(AccountTokenService.SEND_COOLDOWN.toSeconds());
	}

	/**
	 * SMS needs a verified phone and Telegram a linked chat; otherwise the code goes by
	 * e-mail.
	 */
	private void deliverResetToken(User user, AuthChannel channel, AuthTokenChannel tokenChannel, String token) {
		String validity = authMails.describe(VALIDITY, user.preferredLocale());
		if (channel == AuthChannel.SMS && user.isPhoneVerified()) {
			smsService.send(new SmsMessage(user.getPhone(), user.preferredLocale(), "password-reset",
					List.of(token, validity)));
			return;
		}
		if (channel == AuthChannel.TELEGRAM && telegramFacade.sendMessage(user.getId(), messageSource
			.getMessage("telegram.password-reset", new Object[] { token, validity }, user.preferredLocale()))) {
			return;
		}
		authMails.sendPasswordReset(user, tokenChannel, token, VALIDITY);
	}

	@Transactional
	public void resetPasswordByLink(String token, String newPassword) {
		AuthToken authToken = accountTokenService.consumeLinkToken(token, AuthTokenType.PASSWORD_RESET);
		applyNewPassword(authToken.getUserId(), newPassword);
	}

	@Transactional
	public void resetPasswordByOtp(String email, String code, String newPassword) {
		User user = userRepository.findByEmailIgnoreCase(User.normalizeEmail(email))
			.orElseThrow(() -> new AppException(ErrorCode.INVALID_OTP, "This code is wrong or has expired"));
		accountTokenService.consumeOtp(user.getId(), AuthTokenType.PASSWORD_RESET, code);
		applyNewPassword(user.getId(), newPassword);
	}

	/** Signs out every device and counts as proof of owning the inbox. */
	private void applyNewPassword(Long userId, String newPassword) {
		User user = userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
		user.changePassword(passwordEncoder.encode(newPassword));
		user.markEmailVerified();
		refreshTokenRepository.revokeAllByUserId(userId, Instant.now(), RevokeReason.PASSWORD_CHANGED);
		authMails.sendPasswordChanged(user);
	}

}
