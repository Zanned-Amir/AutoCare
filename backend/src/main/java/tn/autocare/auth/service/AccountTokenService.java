package tn.autocare.auth.service;

import java.time.Duration;
import java.time.Instant;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.entity.AuthToken;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.AuthTokenType;
import tn.autocare.auth.repository.AuthTokenRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.ratelimit.RequestLimiter;

/**
 * Issues and consumes one-time tokens (links and OTP codes), with a send cooldown per
 * user.
 */
@Service
@RequiredArgsConstructor
class AccountTokenService {

	static final Duration SEND_COOLDOWN = Duration.ofSeconds(30);

	private final AuthTokenRepository authTokenRepository;

	private final TokenService tokenService;

	private final RequestLimiter requestLimiter;

	/** Throws SEND_COOLDOWN if the same e-mail was requested less than 30 s ago. */
	void checkSendCooldown(Long userId, AuthTokenType type) {
		long wait = requestLimiter.acquireCooldown("send:" + type + ":" + userId, SEND_COOLDOWN);
		if (wait > 0) {
			throw AppException.tooSoon(ErrorCode.SEND_COOLDOWN, "Please wait before asking for another e-mail", wait);
		}
	}

	/** Returns the raw token or code to put in the e-mail; only its hash is stored. */
	@Transactional
	String issueToken(Long userId, AuthTokenType type, AuthTokenChannel channel, Duration validity,
			@Nullable String targetEmail) {
		Instant now = Instant.now();
		authTokenRepository.invalidateActiveTokens(userId, type, now);
		String raw = channel == AuthTokenChannel.LINK ? tokenService.generateOpaqueToken() : tokenService.generateOtp();
		authTokenRepository
			.save(AuthToken.issue(userId, type, channel, tokenService.hash(raw), now.plus(validity), targetEmail));
		return raw;
	}

	@Transactional
	String issuePhoneVerificationCode(Long userId, String phone, Duration validity) {
		Instant now = Instant.now();
		authTokenRepository.invalidateActiveTokens(userId, AuthTokenType.PHONE_VERIFICATION, now);
		String code = tokenService.generateOtp();
		authTokenRepository.save(AuthToken.issueForPhone(userId, tokenService.hash(code), now.plus(validity), phone));
		return code;
	}

	@Transactional
	AuthToken consumeLinkToken(String rawToken, AuthTokenType type) {
		Instant now = Instant.now();
		AuthToken token = authTokenRepository
			.findByTokenHashAndTypeAndChannel(tokenService.hash(rawToken), type, AuthTokenChannel.LINK)
			.filter(candidate -> candidate.isUsable(now))
			.orElseThrow(
					() -> new AppException(ErrorCode.INVALID_ACCOUNT_TOKEN, "This link is invalid or has expired"));
		token.markUsed(now);
		return token;
	}

	/**
	 * Checks the latest OTP of this type. A wrong code is counted even though the request
	 * fails, so this runs in its own transaction that commits the attempt counter.
	 */
	@Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = AppException.class)
	AuthToken consumeOtp(Long userId, AuthTokenType type, String code) {
		Instant now = Instant.now();
		AuthToken token = authTokenRepository
			.findFirstByUserIdAndTypeAndChannelAndUsedAtIsNullOrderByCreatedAtDesc(userId, type, AuthTokenChannel.OTP)
			.filter(candidate -> candidate.isUsable(now))
			.orElseThrow(AccountTokenService::invalidOtp);
		if (!token.getTokenHash().equals(tokenService.hash(code))) {
			token.recordFailedAttempt();
			throw invalidOtp();
		}
		token.markUsed(now);
		return token;
	}

	private static AppException invalidOtp() {
		return new AppException(ErrorCode.INVALID_OTP, "This code is wrong or has expired");
	}

}
