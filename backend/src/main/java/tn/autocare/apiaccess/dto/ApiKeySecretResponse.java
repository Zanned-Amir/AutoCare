package tn.autocare.apiaccess.dto;

/** The full key, shown once: at creation and after a rotation. */
public record ApiKeySecretResponse(ApiKeyResponse apiKey, String key) {
}
