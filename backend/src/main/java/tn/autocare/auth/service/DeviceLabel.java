package tn.autocare.auth.service;

import org.jspecify.annotations.Nullable;

/**
 * "Chrome · Windows" from a User-Agent header. Good enough for a session list, not
 * analytics.
 */
final class DeviceLabel {

	private DeviceLabel() {
	}

	static String of(@Nullable String userAgent) {
		if (userAgent == null || userAgent.isBlank()) {
			return "Appareil inconnu";
		}
		String ua = userAgent.toLowerCase();
		String browser = ua.contains("edg/") ? "Edge"
				: ua.contains("opr/") ? "Opera"
						: ua.contains("firefox/") ? "Firefox"
								: ua.contains("chrome/") ? "Chrome" : ua.contains("safari/") ? "Safari"
										: ua.contains("okhttp") || ua.contains("expo") ? "Application" : "Navigateur";
		String os = ua.contains("android") ? "Android"
				: ua.contains("iphone") || ua.contains("ipad") ? "iOS" : ua.contains("windows") ? "Windows"
						: ua.contains("mac os") ? "macOS" : ua.contains("linux") ? "Linux" : "";
		return os.isEmpty() ? browser : browser + " · " + os;
	}

}
