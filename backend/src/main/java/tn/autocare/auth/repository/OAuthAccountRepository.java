package tn.autocare.auth.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import tn.autocare.auth.entity.OAuthAccount;
import tn.autocare.auth.entity.OAuthProvider;

public interface OAuthAccountRepository extends JpaRepository<OAuthAccount, Long> {

	Optional<OAuthAccount> findByProviderAndProviderAccountId(OAuthProvider provider, String providerAccountId);

	Optional<OAuthAccount> findByUserIdAndProvider(Long userId, OAuthProvider provider);

	List<OAuthAccount> findAllByUserIdOrderByCreatedAtAsc(Long userId);

	long countByUserId(Long userId);

}
