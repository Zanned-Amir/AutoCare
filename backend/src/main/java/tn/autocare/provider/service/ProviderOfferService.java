package tn.autocare.provider.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.organization.api.OrganizationFacade;
import tn.autocare.organization.api.OrganizationType;
import tn.autocare.provider.dto.OfferProviderServiceRequest;
import tn.autocare.provider.dto.ProviderServiceResponse;
import tn.autocare.provider.dto.UpdateProviderServiceRequest;
import tn.autocare.provider.entity.ProviderService;
import tn.autocare.provider.repository.ProviderServiceRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/** A provider organization manages the services it offers. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProviderOfferService {

	private final ProviderServiceRepository providerServiceRepository;

	private final ProviderProfileService profileService;

	private final OrganizationFacade organizationFacade;

	private final CatalogFacade catalogFacade;

	private final ServiceNames serviceNames;

	public List<ProviderServiceResponse> listProviderServices(Long organizationId) {
		Map<Long, String> names = serviceNames.activeServiceNames();
		return providerServiceRepository.findAllByOrganizationIdOrderByIdAsc(organizationId)
			.stream()
			.map(service -> toResponse(service, names))
			.toList();
	}

	/**
	 * How many organizations offer each catalog service (services nobody offers are
	 * absent).
	 */
	public Map<Long, Long> countProvidersByService() {
		Map<Long, Long> counts = new HashMap<>();
		for (Object[] row : providerServiceRepository.countProvidersByService()) {
			counts.put((Long) row[0], (Long) row[1]);
		}
		return counts;
	}

	@Transactional
	public ProviderServiceResponse offerProviderService(Long organizationId, OfferProviderServiceRequest request) {
		if (organizationFacade.getOrganization(organizationId).type() != OrganizationType.PROVIDER) {
			throw new AppException(ErrorCode.ORGANIZATION_NOT_PROVIDER, "Only provider organizations offer services");
		}
		if (!catalogFacade.existsActiveAutoService(request.serviceId())) {
			throw new AppException(ErrorCode.PROVIDER_SERVICE_UNAVAILABLE, "This service is not in the catalog");
		}
		if (providerServiceRepository.existsByOrganizationIdAndServiceId(organizationId, request.serviceId())) {
			throw new AppException(ErrorCode.PROVIDER_SERVICE_ALREADY_OFFERED, "This service is already offered");
		}
		ProviderService saved = providerServiceRepository.save(ProviderService.offer(organizationId,
				request.serviceId(), request.atHome(), request.indicativePrice()));
		profileService.reindexProfile(organizationId);
		return toResponse(saved, serviceNames.activeServiceNames());
	}

	@Transactional
	public ProviderServiceResponse updateProviderService(Long organizationId, Long providerServiceId,
			UpdateProviderServiceRequest request) {
		ProviderService service = findOrThrow(organizationId, providerServiceId);
		service.update(request.atHome(), request.indicativePrice());
		return toResponse(service, serviceNames.activeServiceNames());
	}

	@Transactional
	public void removeProviderService(Long organizationId, Long providerServiceId) {
		providerServiceRepository.delete(findOrThrow(organizationId, providerServiceId));
		providerServiceRepository.flush();
		profileService.reindexProfile(organizationId);
	}

	private ProviderService findOrThrow(Long organizationId, Long providerServiceId) {
		return providerServiceRepository.findByIdAndOrganizationId(providerServiceId, organizationId)
			.orElseThrow(() -> AppException.notFound("Provider service", providerServiceId));
	}

	static ProviderServiceResponse toResponse(ProviderService service, Map<Long, String> names) {
		return new ProviderServiceResponse(service.getId(), service.getServiceId(),
				ServiceNames.lookup(names).apply(service.getServiceId()), service.isAtHome(),
				service.getIndicativePrice(), service.getCurrency());
	}

}
