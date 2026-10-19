package tn.autocare.auth.entity;

import org.jspecify.annotations.Nullable;

/** What a provider tells us about the person signing in. */
public record OAuthProfileData(OAuthProvider provider, String subject, @Nullable String email, boolean emailVerified,
		@Nullable String name, @Nullable String pictureUrl) {
}
