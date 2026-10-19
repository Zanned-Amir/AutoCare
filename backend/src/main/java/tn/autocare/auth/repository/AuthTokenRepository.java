package tn.autocare.auth.repository;

import java.time.Instant;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.auth.entity.AuthToken;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.AuthTokenType;

public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {

	Optional<AuthToken> findByTokenHashAndTypeAndChannel(String tokenHash, AuthTokenType type,
			AuthTokenChannel channel);

	Optional<AuthToken> findFirstByUserIdAndTypeAndChannelAndUsedAtIsNullOrderByCreatedAtDesc(Long userId,
			AuthTokenType type, AuthTokenChannel channel);

	/** Issuing a new token makes the previous unused ones of the same type invalid. */
	@Modifying
	@Query("update AuthToken t set t.usedAt = :now where t.userId = :userId and t.type = :type and t.usedAt is null")
	int invalidateActiveTokens(Long userId, AuthTokenType type, Instant now);

}
