package tn.autocare.servicerequest.api;

import java.math.BigDecimal;

/** The provider sent (or replaced) a quote: the client is told. */
public record ServiceRequestQuoted(Long serviceRequestId, Long organizationId, Long userId, BigDecimal amount,
		String currency) {
}
