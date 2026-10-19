package tn.autocare.auth.api;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * What other modules may ask the auth module. Implemented by
 * {@code tn.autocare.auth.service.AuthFacadeImpl}.
 */
public interface AuthFacade {

	Optional<UserSummary> findUser(Long userId);

	UserSummary getUser(Long userId);

	Optional<UserSummary> findUserByEmail(String email);

	List<UserSummary> listUsers(Collection<Long> userIds);

	boolean hasPlatformPermission(Long userId, String permission);

}
