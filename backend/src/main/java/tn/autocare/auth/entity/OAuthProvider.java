package tn.autocare.auth.entity;

import java.util.Arrays;
import java.util.Optional;

/** Sign-in providers (template: identity/oauth). Apple works with ID tokens only. */
public enum OAuthProvider {

	GOOGLE(true, true), FACEBOOK(true, false), GITHUB(true, false), APPLE(false, true);

	private final boolean redirectFlow;

	private final boolean idTokenFlow;

	OAuthProvider(boolean redirectFlow, boolean idTokenFlow) {
		this.redirectFlow = redirectFlow;
		this.idTokenFlow = idTokenFlow;
	}

	public boolean supportsRedirectFlow() {
		return redirectFlow;
	}

	public boolean supportsIdToken() {
		return idTokenFlow;
	}

	public String key() {
		return name().toLowerCase();
	}

	public static Optional<OAuthProvider> fromKey(String key) {
		return Arrays.stream(values()).filter(provider -> provider.key().equalsIgnoreCase(key)).findFirst();
	}

}
