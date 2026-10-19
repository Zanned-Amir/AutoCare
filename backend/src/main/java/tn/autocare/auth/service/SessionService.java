package tn.autocare.auth.service;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.SessionResponse;
import tn.autocare.auth.entity.RevokeReason;
import tn.autocare.auth.repository.RefreshTokenRepository;
import tn.autocare.shared.exception.AppException;

/**
 * The devices signed in to an account. Revoking a session stops its refresh token at
 * once; its current access token stays valid until it expires (15 minutes at most).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SessionService {

	private final RefreshTokenRepository refreshTokenRepository;

	public List<SessionResponse> listSessions(Long userId, @Nullable Long currentSessionId) {
		return refreshTokenRepository
			.findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByUpdatedAtDesc(userId, Instant.now())
			.stream()
			.map(token -> new SessionResponse(token.getId(), DeviceLabel.of(token.getUserAgent()), token.getIpAddress(),
					token.getSessionStartedAt(), token.getCreatedAt(), Objects.equals(token.getId(), currentSessionId)))
			.toList();
	}

	@Transactional
	public void revokeSession(Long userId, Long sessionId) {
		refreshTokenRepository.findByIdAndUserId(sessionId, userId)
			.orElseThrow(() -> AppException.notFound("Session", sessionId))
			.revoke(Instant.now(), RevokeReason.REVOKED_BY_USER);
	}

	@Transactional
	public void revokeOtherSessions(Long userId, @Nullable Long currentSessionId) {
		if (currentSessionId == null) {
			refreshTokenRepository.revokeAllByUserId(userId, Instant.now(), RevokeReason.REVOKED_BY_USER);
		}
		else {
			refreshTokenRepository.revokeAllByUserIdExcept(userId, currentSessionId, Instant.now(),
					RevokeReason.REVOKED_BY_USER);
		}
	}

}
