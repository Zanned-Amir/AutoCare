package tn.autocare.servicerequest.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Amount in TND, 3 decimals (millimes). */
public record SendQuoteRequest(
		@NotNull @DecimalMin("0.000") @DecimalMax("999999.999") @Digits(integer = 6, fraction = 3) BigDecimal amount,
		@Size(max = 1000) String note) {
}
