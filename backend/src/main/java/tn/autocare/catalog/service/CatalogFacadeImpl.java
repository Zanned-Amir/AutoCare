package tn.autocare.catalog.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;
import tn.autocare.catalog.mapper.AutoServiceMapper;
import tn.autocare.catalog.repository.AutoServiceRepository;

/**
 * Entry point for other modules. Controllers use {@link CatalogService}; other modules
 * use {@link CatalogFacade}, so the module can later move behind HTTP without changing
 * them.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class CatalogFacadeImpl implements CatalogFacade {

	private final CatalogService catalogService;

	private final AutoServiceRepository autoServiceRepository;

	private final AutoServiceMapper autoServiceMapper;

	@Override
	public List<AutoServiceDto> listActiveAutoServices() {
		return catalogService.listActiveAutoServices();
	}

	@Override
	public Optional<AutoServiceDto> findAutoService(Long autoServiceId) {
		return autoServiceRepository.findById(autoServiceId).map(autoServiceMapper::toDto);
	}

	@Override
	public AutoServiceDto getAutoService(Long autoServiceId) {
		return catalogService.getAutoService(autoServiceId);
	}

	@Override
	public boolean existsActiveAutoService(Long autoServiceId) {
		return autoServiceRepository.existsByIdAndActiveTrue(autoServiceId);
	}

}
