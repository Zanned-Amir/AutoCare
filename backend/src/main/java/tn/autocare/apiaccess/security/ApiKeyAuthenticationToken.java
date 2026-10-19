package tn.autocare.apiaccess.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Authenticated API key; its permissions are its authorities ("providers:read"...). */
public class ApiKeyAuthenticationToken extends AbstractAuthenticationToken {

	private final ApiKeyPrincipal principal;

	public ApiKeyAuthenticationToken(ApiKeyPrincipal principal) {
		super(principal.permissions().stream().map(SimpleGrantedAuthority::new).toList());
		this.principal = principal;
		setAuthenticated(true);
	}

	@Override
	public Object getCredentials() {
		return "";
	}

	@Override
	public ApiKeyPrincipal getPrincipal() {
		return principal;
	}

}
