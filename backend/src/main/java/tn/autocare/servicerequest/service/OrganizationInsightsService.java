package tn.autocare.servicerequest.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.servicerequest.api.QuoteStatus;
import tn.autocare.servicerequest.api.RequestStatus;
import tn.autocare.servicerequest.dto.OrganizationInsightsResponse;
import tn.autocare.servicerequest.dto.OrganizationInsightsResponse.ServiceCount;
import tn.autocare.servicerequest.dto.OrganizationInsightsResponse.WeekPoint;
import tn.autocare.servicerequest.entity.ServiceRequest;
import tn.autocare.servicerequest.repository.ServiceRequestRepository;

/** Figures for the garage dashboard, computed from its requests of the period. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationInsightsService {

	private static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

	private static final int TOP_SERVICES = 5;

	private final ServiceRequestRepository requestRepository;

	private final CatalogFacade catalogFacade;

	public OrganizationInsightsResponse getOrganizationInsights(Long organizationId, int weeks) {
		LocalDate firstWeek = LocalDate.now(TUNIS)
			.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.minusWeeks(weeks - 1L);
		List<ServiceRequest> requests = requestRepository.findAllByOrganizationIdAndCreatedAtGreaterThanEqual(
				organizationId, firstWeek.atStartOfDay(TUNIS).toInstant());

		Map<LocalDate, long[]> byWeek = new LinkedHashMap<>();
		for (int i = 0; i < weeks; i++) {
			byWeek.put(firstWeek.plusWeeks(i), new long[2]);
		}
		for (ServiceRequest request : requests) {
			byWeek.get(weekOf(LocalDate.ofInstant(request.getCreatedAt(), TUNIS)))[0]++;
			if (request.getCompletedAt() != null) {
				long[] week = byWeek.get(weekOf(LocalDate.ofInstant(request.getCompletedAt(), TUNIS)));
				if (week != null) {
					week[1]++;
				}
			}
		}
		List<WeekPoint> points = byWeek.entrySet()
			.stream()
			.map(entry -> new WeekPoint(entry.getKey(), entry.getValue()[0], entry.getValue()[1]))
			.toList();

		Map<Long, Long> byService = requests.stream()
			.collect(Collectors.groupingBy(ServiceRequest::getServiceId, Collectors.counting()));
		List<ServiceCount> topServices = new ArrayList<>(byService.entrySet()
			.stream()
			.sorted(Map.Entry.<Long, Long>comparingByValue(Comparator.reverseOrder()))
			.limit(TOP_SERVICES)
			.map(entry -> new ServiceCount(entry.getKey(),
					catalogFacade.findAutoService(entry.getKey()).map(AutoServiceDto::name).orElse(null),
					entry.getValue()))
			.toList());

		long confirmed = requests.stream().filter(r -> wasConfirmed(r.getStatus())).count();
		long refused = requests.stream().filter(r -> r.getStatus() == RequestStatus.REJECTED).count();
		Double acceptRate = confirmed + refused == 0 ? null : (double) confirmed / (confirmed + refused);
		BigDecimal acceptedQuotes = requests.stream()
			.filter(r -> r.getQuoteStatus() == QuoteStatus.ACCEPTED && r.getQuoteAmount() != null)
			.map(ServiceRequest::getQuoteAmount)
			.reduce(BigDecimal.ZERO, BigDecimal::add)
			.setScale(3, RoundingMode.HALF_UP);
		long completed = requests.stream().filter(r -> r.getStatus() == RequestStatus.COMPLETED).count();
		return new OrganizationInsightsResponse(points, topServices, acceptRate, acceptedQuotes, requests.size(),
				completed);
	}

	private static LocalDate weekOf(LocalDate day) {
		return day.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
	}

	private static boolean wasConfirmed(RequestStatus status) {
		return status == RequestStatus.CONFIRMED || status == RequestStatus.IN_PROGRESS
				|| status == RequestStatus.COMPLETED;
	}

}
