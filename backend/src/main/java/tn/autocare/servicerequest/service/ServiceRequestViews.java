package tn.autocare.servicerequest.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.AuthFacade;
import tn.autocare.auth.api.UserSummary;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.diagnostic.api.DiagnosticFacade;
import tn.autocare.diagnostic.api.DiagnosticResultDto;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationSummary;
import tn.autocare.servicerequest.dto.ServiceRequestResponse;
import tn.autocare.servicerequest.dto.ServiceRequestResponse.CustomerInfo;
import tn.autocare.servicerequest.dto.ServiceRequestResponse.DiagnosticInfo;
import tn.autocare.servicerequest.dto.ServiceRequestResponse.OrganizationInfo;
import tn.autocare.servicerequest.dto.ServiceRequestResponse.QuoteInfo;
import tn.autocare.servicerequest.dto.ServiceRequestResponse.ServiceInfo;
import tn.autocare.servicerequest.dto.ServiceRequestResponse.VehicleInfo;
import tn.autocare.servicerequest.dto.StatusChangeResponse;
import tn.autocare.servicerequest.entity.ServiceRequest;
import tn.autocare.servicerequest.entity.StatusChange;
import tn.autocare.vehicle.api.VehicleDto;
import tn.autocare.vehicle.api.VehicleFacade;

/**
 * Builds responses from IDs through the other modules' facades, one lookup per distinct
 * id on a page.
 */
@Component
@RequiredArgsConstructor
class ServiceRequestViews {

	private final CatalogFacade catalogFacade;

	private final OrganizationFacade organizationFacade;

	private final VehicleFacade vehicleFacade;

	private final AuthFacade authFacade;

	private final DiagnosticFacade diagnosticFacade;

	List<ServiceRequestResponse> toResponses(List<ServiceRequest> requests, boolean withCustomer) {
		Map<Long, String> services = catalogFacade.listActiveAutoServices()
			.stream()
			.collect(Collectors.toMap(AutoServiceDto::id, AutoServiceDto::name));
		Map<Long, OrganizationSummary> organizations = lookup(requests, ServiceRequest::getOrganizationId,
				organizationFacade::findOrganization);
		Map<Long, VehicleDto> vehicles = lookup(requests, ServiceRequest::getVehicleId, vehicleFacade::findVehicle);
		Map<Long, DiagnosticResultDto> diagnostics = lookup(requests, ServiceRequest::getDiagnosticId,
				diagnosticFacade::findDiagnostic);
		Map<Long, UserSummary> customers = withCustomer
				? authFacade.listUsers(requests.stream().map(ServiceRequest::getUserId).distinct().toList())
					.stream()
					.collect(Collectors.toMap(UserSummary::id, Function.identity()))
				: Map.of();

		return requests.stream().map(request -> {
			String serviceName = services.computeIfAbsent(request.getServiceId(),
					id -> catalogFacade.findAutoService(id).map(AutoServiceDto::name).orElse(null));
			OrganizationSummary org = organizations.get(request.getOrganizationId());
			VehicleDto vehicle = vehicles.get(request.getVehicleId());
			DiagnosticResultDto diagnostic = diagnostics.get(request.getDiagnosticId());
			UserSummary customer = customers.get(request.getUserId());
			return new ServiceRequestResponse(request.getId(), request.getStatus(), request.getDesiredDate(),
					request.getDesiredTime(), request.getLocationType(), request.getLocation(), request.getNote(),
					request.getRejectionReason(), request.getCancellationReason(),
					new ServiceInfo(request.getServiceId(), serviceName),
					org == null ? null : new OrganizationInfo(org.id(), org.name(), org.governorate(), org.city()),
					vehicle == null ? null
							: new VehicleInfo(vehicle.id(), vehicle.brand(), vehicle.model(), vehicle.year(),
									vehicle.mileage(), vehicle.plate()),
					customer == null ? null
							: new CustomerInfo(customer.id(), customer.fullName(), customer.phone(), customer.email()),
					diagnostic == null ? null : new DiagnosticInfo(diagnostic.id(), diagnostic.possibleCause()),
					request.getQuoteStatus() == null ? null
							: new QuoteInfo(request.getQuoteAmount(), request.getQuoteCurrency(),
									request.getQuoteNote(), request.getQuoteStatus(), request.getQuotedAt()),
					request.getCreatedAt(), request.getUpdatedAt(), request.getCompletedAt());
		}).toList();
	}

	ServiceRequestResponse toResponse(ServiceRequest request, boolean withCustomer) {
		return toResponses(List.of(request), withCustomer).getFirst();
	}

	List<StatusChangeResponse> toHistory(ServiceRequest request, List<StatusChange> changes) {
		return changes.stream()
			.map(change -> new StatusChangeResponse(change.getFromStatus(), change.getToStatus(),
					request.isCreatedBy(change.getChangedBy()) ? "CLIENT" : "PROVIDER", change.getNote(),
					change.getCreatedAt()))
			.toList();
	}

	private static <T> Map<Long, T> lookup(Collection<ServiceRequest> requests, Function<ServiceRequest, Long> id,
			Function<Long, Optional<T>> finder) {
		return requests.stream()
			.map(id)
			.filter(Objects::nonNull)
			.distinct()
			.map(key -> finder.apply(key).map(value -> Map.entry(key, value)))
			.flatMap(Optional::stream)
			.collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
	}

}
