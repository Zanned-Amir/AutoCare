package tn.autocare.auth.service;

import java.time.Duration;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.SentResponse;
import tn.autocare.auth.entity.AuthToken;
import tn.autocare.auth.entity.AuthTokenType;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.sms.SmsMessage;
import tn.autocare.shared.sms.SmsService;

/** Verifies the profile phone number with a code sent by SMS. */
@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

	static final Duration VALIDITY = Duration.ofMinutes(10);

	private final UserRepository userRepository;

	private final AccountTokenService accountTokenService;

	private final AuthMails authMails;

	private final SmsService smsService;

	@Transactional
	public SentResponse sendPhoneVerification(Long userId) {
		User user = findUser(userId);
		if (user.getPhone() == null) {
			throw new AppException(ErrorCode.PHONE_REQUIRED, "Add a phone number to your profile first");
		}
		if (user.isPhoneVerified()) {
			throw new AppException(ErrorCode.PHONE_ALREADY_VERIFIED, "This phone number is already verified");
		}
		accountTokenService.checkSendCooldown(userId, AuthTokenType.PHONE_VERIFICATION);
		String code = accountTokenService.issuePhoneVerificationCode(userId, user.getPhone(), VALIDITY);
		smsService.send(new SmsMessage(user.getPhone(), user.preferredLocale(), "phone-verification",
				List.of(code, authMails.describe(VALIDITY, user.preferredLocale()))));
		return new SentResponse(AccountTokenService.SEND_COOLDOWN.toSeconds());
	}

	@Transactional
	public void confirmPhone(Long userId, String code) {
		AuthToken token = accountTokenService.consumeOtp(userId, AuthTokenType.PHONE_VERIFICATION, code);
		User user = findUser(userId);
		// The number may have changed since the code was sent.
		if (!token.getTargetPhone().equals(user.getPhone())) {
			throw new AppException(ErrorCode.INVALID_OTP, "This code is wrong or has expired");
		}
		user.markPhoneVerified();
	}

	private User findUser(Long userId) {
		return userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
	}

}
