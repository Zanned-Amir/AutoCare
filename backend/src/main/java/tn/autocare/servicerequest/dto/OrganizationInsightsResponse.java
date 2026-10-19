package tn.autocare.servicerequest.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * Activity of a garage over the last weeks (Monday-based, Tunis time).
 * {@code acceptRate}: confirmed share of the requests the garage answered (confirmed or
 * refused), null when none. {@code acceptedQuotes}: total of the quotes clients accepted,
 * in TND.
 */
public record OrganizationInsightsResponse(List<WeekPoint> weeks, List<ServiceCount> topServices, Double acceptRate,
		@JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal acceptedQuotes, long received, long completed) {

	public record WeekPoint(LocalDate weekStart, long created, long completed) {
	}

	public record ServiceCount(Long serviceId, String name, long count) {
	}

}
