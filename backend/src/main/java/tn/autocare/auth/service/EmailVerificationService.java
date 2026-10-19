package tn.autocare.auth.service;

import java.time.Duration;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.AuthChannel;
import tn.autocare.auth.dto.SentResponse;
import tn.autocare.auth.entity.AuthToken;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.AuthTokenType;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

	static final Duration LINK_VALIDITY = Duration.ofHours(24);

	static final Duration OTP_VALIDITY = Duration.ofMinutes(15);

	private final UserRepository userRepository;

	private final AccountTokenService accountTokenService;

	private final AuthMails authMails;

	@Transactional
	public SentResponse sendEmailVerification(Long userId, AuthChannel channel) {
		User user = userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
		if (user.isEmailVerified()) {
			throw new AppException(ErrorCode.EMAIL_ALREADY_VERIFIED, "This email is already verified");
		}
		accountTokenService.checkSendCooldown(userId, AuthTokenType.EMAIL_VERIFICATION);
		send(user, toChannel(channel));
		return new SentResponse(AccountTokenService.SEND_COOLDOWN.toSeconds());
	}

	/** First verification e-mail, sent right after sign-up (no cooldown check). */
	public void sendVerificationAfterRegistration(User user, AuthTokenChannel channel) {
		send(user, channel);
	}

	@Transactional
	public void confirmEmailByLink(String token) {
		AuthToken authToken = accountTokenService.consumeLinkToken(token, AuthTokenType.EMAIL_VERIFICATION);
		userRepository.findById(authToken.getUserId()).ifPresent(this::completeVerification);
	}

	@Transactional
	public void confirmEmailByOtp(Long userId, String code) {
		accountTokenService.consumeOtp(userId, AuthTokenType.EMAIL_VERIFICATION, code);
		userRepository.findById(userId).ifPresent(this::completeVerification);
	}

	/**
	 * The welcome e-mail goes out once the address is confirmed, so it never lands in a
	 * stranger's inbox.
	 */
	private void completeVerification(User user) {
		if (!user.isEmailVerified()) {
			user.markEmailVerified();
			authMails.sendWelcome(user);
		}
	}

	private void send(User user, AuthTokenChannel channel) {
		Duration validity = channel == AuthTokenChannel.LINK ? LINK_VALIDITY : OTP_VALIDITY;
		String token = accountTokenService.issueToken(user.getId(), AuthTokenType.EMAIL_VERIFICATION, channel, validity,
				null);
		authMails.sendEmailVerification(user, channel, token, validity);
	}

	static AuthTokenChannel toChannel(AuthChannel channel) {
		return channel == AuthChannel.OTP ? AuthTokenChannel.OTP : AuthTokenChannel.LINK;
	}

}
