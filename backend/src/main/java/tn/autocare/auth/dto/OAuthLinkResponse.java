package tn.autocare.auth.dto;

/** Send the browser to {@code url} to authorize linking. */
public record OAuthLinkResponse(String url) {
}
