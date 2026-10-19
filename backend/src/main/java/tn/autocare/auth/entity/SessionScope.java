package tn.autocare.auth.entity;

/**
 * Where a session may be used. CUSTOMER: the web/mobile app. BACKOFFICE: staff tools;
 * only for users with a backoffice role, shorter lifetime, required by every /admin/**
 * endpoint.
 */
public enum SessionScope {

	CUSTOMER, BACKOFFICE;

	public String claim() {
		return name().toLowerCase();
	}

}
