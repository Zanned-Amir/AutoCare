package tn.autocare.servicerequest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostRequestMessageRequest(@NotBlank @Size(max = 2000) String body) {
}
