package tn.autocare.provider.api;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonFormat;

/** A service offered by a provider. {@code indicativePrice} is null for "on quote". */
public record ProviderServiceDto(Long id, Long organizationId, Long serviceId, boolean atHome,
		@JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal indicativePrice, String currency) {
}
