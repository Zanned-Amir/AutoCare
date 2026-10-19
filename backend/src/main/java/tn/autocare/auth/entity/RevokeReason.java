package tn.autocare.auth.entity;

public enum RevokeReason {

	/** Replaced by a new token on refresh (normal). */
	ROTATED, LOGOUT, LOGOUT_ALL, REVOKED_BY_USER, PASSWORD_CHANGED, REUSE_DETECTED, ACCOUNT_DISABLED

}
