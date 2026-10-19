package tn.autocare.auth.service;

import org.jspecify.annotations.Nullable;

/** Who is calling, for the session list and new-device alerts. */
public record ClientInfo(@Nullable String userAgent, @Nullable String ipAddress) {
}
