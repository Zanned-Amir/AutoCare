package tn.autocare.servicerequest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectServiceRequestRequest(@NotBlank @Size(max = 500) String reason) {
}
