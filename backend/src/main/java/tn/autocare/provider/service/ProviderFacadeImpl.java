package tn.autocare.provider.service;

import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.provider.api.OfferedService;
import tn.autocare.provider.api.ProviderFacade;
import tn.autocare.provider.api.ProviderSummary;
import tn.autocare.provider.api.ProviderServiceDto;
import tn.autocare.provider.mapper.ProviderServiceMapper;
import tn.autocare.provider.repository.ProviderServiceRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class ProviderFacadeImpl implements ProviderFacade {

	private final ProviderServiceRepository providerServiceRepository;

	private final ProviderServiceMapper providerServiceMapper;

	private final ProviderSearchService providerSearchService;

	@Override
	public List<ProviderServiceDto> listProviderServices(Long organizationId) {
		return providerServiceRepository.findAllByOrganizationIdOrderByIdAsc(organizationId)
			.stream()
			.map(providerServiceMapper::toDto)
			.toList();
	}

	@Override
	public boolean isServiceOffered(Long organizationId, Long serviceId, boolean atHome) {
		return providerServiceRepository.findByOrganizationIdAndServiceId(organizationId, serviceId)
			.map(service -> !atHome || service.isAtHome())
			.orElse(false);
	}

	@Override
	public Page<ProviderSummary> searchProviders(@Nullable Long serviceId, @Nullable String governorate,
			@Nullable Boolean atHome, @Nullable String query, Pageable pageable) {
		return providerSearchService.searchProviders(serviceId, governorate, atHome, query, pageable)
			.map(result -> new ProviderSummary(result.organizationId(), result.name(), result.governorate(),
					result.city(), result.phone(),
					result.services()
						.stream()
						.map(s -> new OfferedService(s.serviceId(), s.serviceName(), s.atHome(), s.indicativePrice(),
								s.currency()))
						.toList()));
	}

}
