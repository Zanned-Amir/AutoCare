package tn.autocare.apiaccess.security;

import java.util.List;

/** The partner calling /external/**. */
public record ApiKeyPrincipal(Long id, String keyId, String label, String environment, List<String> permissions) {
}
