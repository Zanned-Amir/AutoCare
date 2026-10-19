package tn.autocare.auth.dto;

/**
 * Answer to "send me an e-mail": {@code retryAfter} seconds before another one can be
 * requested.
 */
public record SentResponse(long retryAfter) {
}
