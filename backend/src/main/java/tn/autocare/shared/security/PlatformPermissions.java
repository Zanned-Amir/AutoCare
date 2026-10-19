package tn.autocare.shared.security;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Checks platform permissions carried by the JWT. Used from
 * {@code @PreAuthorize("@perm.has('vehicle:read')")}. Organization permissions are
 * checked by the organization module's own bean.
 */
@Component("perm")
public class PlatformPermissions {

	public boolean has(String permission) {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null || !auth.isAuthenticated()) {
			return false;
		}
		Set<String> held = auth.getAuthorities()
			.stream()
			.map(GrantedAuthority::getAuthority)
			.collect(Collectors.toSet());
		return PermissionMatcher.grants(held, permission);
	}

}
