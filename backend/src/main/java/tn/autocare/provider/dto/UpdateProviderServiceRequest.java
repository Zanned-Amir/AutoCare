package tn.autocare.provider.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

public record UpdateProviderServiceRequest(@NotNull Boolean atHome,
		@DecimalMin("0.000") @Digits(integer = 9, fraction = 3) BigDecimal indicativePrice) {
}
