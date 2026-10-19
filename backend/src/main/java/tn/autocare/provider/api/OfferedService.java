package tn.autocare.provider.api;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonFormat;

public record OfferedService(Long serviceId, String serviceName, boolean atHome,
		@JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal indicativePrice, String currency) {
}
