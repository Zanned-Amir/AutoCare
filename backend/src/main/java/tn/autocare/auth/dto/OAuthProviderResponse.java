package tn.autocare.auth.dto;

/**
 * An enabled provider. {@code redirect}: web button flow. {@code idToken}: native/JS SDK
 * flow.
 */
public record OAuthProviderResponse(String provider, boolean redirect, boolean idToken) {
}
