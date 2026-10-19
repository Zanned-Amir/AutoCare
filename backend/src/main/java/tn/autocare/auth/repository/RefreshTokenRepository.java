package tn.autocare.auth.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.auth.entity.RefreshToken;
import tn.autocare.auth.entity.RevokeReason;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

	Optional<RefreshToken> findByTokenHash(String tokenHash);

	Optional<RefreshToken> findByIdAndUserId(Long id, Long userId);

	List<RefreshToken> findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfterOrderByUpdatedAtDesc(Long userId, Instant now);

	boolean existsByUserIdAndUserAgentAndIdNot(Long userId, String userAgent, Long id);

	@Modifying
	@Query("update RefreshToken t set t.revokedAt = :now, t.revokeReason = :reason where t.userId = :userId and t.revokedAt is null")
	int revokeAllByUserId(Long userId, Instant now, RevokeReason reason);

	@Modifying
	@Query("update RefreshToken t set t.revokedAt = :now, t.revokeReason = :reason where t.userId = :userId and t.revokedAt is null and t.id <> :keepId")
	int revokeAllByUserIdExcept(Long userId, Long keepId, Instant now, RevokeReason reason);

}
