package tn.autocare.servicerequest.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** Optional work report, copied into the vehicle's maintenance history. */
public record CompleteServiceRequestRequest(@Min(0) @Max(2_000_000) Integer mileage, @Size(max = 2000) String result,
		@Size(max = 2000) String recommendations) {
}
