package tn.autocare.apiaccess.dto;

import jakarta.validation.constraints.Size;

public record RevokeApiKeyRequest(@Size(max = 255) String reason) {
}
