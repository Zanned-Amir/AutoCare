package tn.autocare.catalog.service;

import java.util.List;

import org.jspecify.annotations.Nullable;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceActivationChanged;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.dto.CreateAutoServiceRequest;
import tn.autocare.catalog.dto.UpdateAutoServiceRequest;
import tn.autocare.catalog.entity.AutoService;
import tn.autocare.catalog.mapper.AutoServiceMapper;
import tn.autocare.catalog.repository.AutoServiceRepository;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;
import tn.autocare.shared.tx.AfterCommit;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

	public static final String ACTIVE_SERVICES_CACHE = "catalog-active-services";

	private final AutoServiceRepository autoServiceRepository;

	private final AutoServiceMapper autoServiceMapper;

	private final ApplicationEventPublisher events;

	private final CacheManager cacheManager;

	@Cacheable(ACTIVE_SERVICES_CACHE)
	public List<AutoServiceDto> listActiveAutoServices() {
		return autoServiceRepository.findAllByActiveTrueOrderByNameAsc()
			.stream()
			.map(autoServiceMapper::toDto)
			.toList();
	}

	public AutoServiceDto getAutoService(Long autoServiceId) {
		return autoServiceMapper.toDto(findAutoServiceOrThrow(autoServiceId));
	}

	public Page<AutoServiceDto> searchAutoServices(@Nullable String query, @Nullable Boolean active,
			Pageable pageable) {
		String name = StringUtils.hasText(query) ? query.trim() : "";
		Page<AutoService> page = active == null
				? autoServiceRepository.findAllByNameContainingIgnoreCase(name, pageable)
				: autoServiceRepository.findAllByNameContainingIgnoreCaseAndActive(name, active, pageable);
		return page.map(autoServiceMapper::toDto);
	}

	@Transactional
	public AutoServiceDto createAutoService(CreateAutoServiceRequest request) {
		evictActiveServicesAfterCommit();
		if (autoServiceRepository.existsByNameIgnoreCase(request.name().trim())) {
			throw new AppException(ErrorCode.AUTO_SERVICE_NAME_TAKEN, "A service with this name already exists");
		}
		AutoService saved = autoServiceRepository
			.save(AutoService.create(request.name(), request.description(), request.icon()));
		return autoServiceMapper.toDto(saved);
	}

	@Transactional
	public AutoServiceDto updateAutoService(Long adminId, Long autoServiceId, UpdateAutoServiceRequest request) {
		evictActiveServicesAfterCommit();
		AutoService service = findAutoServiceOrThrow(autoServiceId);
		autoServiceRepository.findByNameIgnoreCase(request.name().trim())
			.filter(other -> !other.getId().equals(autoServiceId))
			.ifPresent(other -> {
				throw new AppException(ErrorCode.AUTO_SERVICE_NAME_TAKEN, "A service with this name already exists");
			});
		boolean wasActive = service.isActive();
		service.update(request.name(), request.description(), request.active(), request.icon());
		if (wasActive != service.isActive()) {
			events.publishEvent(new AutoServiceActivationChanged(autoServiceId, service.isActive(), adminId));
		}
		return autoServiceMapper.toDto(service);
	}

	/**
	 * Hidden from the catalog, search and new requests; providers keep it in their offer
	 * and running requests go on.
	 */
	@Transactional
	public AutoServiceDto deactivateAutoService(Long adminId, Long autoServiceId) {
		evictActiveServicesAfterCommit();
		AutoService service = findAutoServiceOrThrow(autoServiceId);
		if (service.isActive()) {
			service.deactivate();
			events.publishEvent(new AutoServiceActivationChanged(autoServiceId, false, adminId));
		}
		return autoServiceMapper.toDto(service);
	}

	@Transactional
	public AutoServiceDto reactivateAutoService(Long adminId, Long autoServiceId) {
		evictActiveServicesAfterCommit();
		AutoService service = findAutoServiceOrThrow(autoServiceId);
		if (!service.isActive()) {
			service.reactivate();
			events.publishEvent(new AutoServiceActivationChanged(autoServiceId, true, adminId));
		}
		return autoServiceMapper.toDto(service);
	}

	/**
	 * After the commit, not before: a reader in between (provider search runs on its own
	 * threads) would otherwise cache the old list again for an hour.
	 * {@code invalidate()}, not {@code clear()} (what {@code @CacheEvict} uses): the
	 * Redis cache may clear later, so the next read right after the save could still get
	 * the old list.
	 */
	private void evictActiveServicesAfterCommit() {
		AfterCommit.run(() -> {
			var cache = cacheManager.getCache(ACTIVE_SERVICES_CACHE);
			if (cache != null) {
				cache.invalidate();
			}
		});
	}

	private AutoService findAutoServiceOrThrow(Long autoServiceId) {
		return autoServiceRepository.findById(autoServiceId)
			.orElseThrow(() -> AppException.notFound("Service", autoServiceId));
	}

}
