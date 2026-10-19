package tn.autocare.servicerequest.dto;

import jakarta.validation.constraints.Size;

public record CancelServiceRequestRequest(@Size(max = 500) String reason) {
}
