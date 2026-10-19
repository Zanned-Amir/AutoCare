package tn.autocare.shared.security;

import java.util.Collection;

/**
 * Permissions are {@code resource:action}. {@code r:a} is granted by {@code r:a},
 * {@code r:*}, {@code *:a} or {@code *:*}.
 */
public final class PermissionMatcher {

	private PermissionMatcher() {
	}

	public static boolean grants(Collection<String> held, String required) {
		int sep = required.indexOf(':');
		if (sep < 0) {
			throw new IllegalArgumentException("Permission must be resource:action, got " + required);
		}
		String resource = required.substring(0, sep);
		String action = required.substring(sep + 1);
		return held.contains(required) || held.contains(resource + ":*") || held.contains("*:" + action)
				|| held.contains("*:*");
	}

}
