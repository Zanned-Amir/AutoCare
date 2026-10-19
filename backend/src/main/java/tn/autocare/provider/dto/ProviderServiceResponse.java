package tn.autocare.provider.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * A provider's offered service with the catalog name, for the workspace and public pages.
 */
public record ProviderServiceResponse(Long id, Long serviceId, String serviceName, boolean atHome,
		@JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal indicativePrice, String currency) {
}
