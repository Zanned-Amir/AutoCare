package tn.autocare.provider.service;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.provider.dto.ProviderSearchResult;
import tn.autocare.provider.dto.ProviderServiceResponse;
import tn.autocare.provider.entity.ProviderProfile;
import tn.autocare.provider.entity.ProviderService;
import tn.autocare.provider.repository.ProviderProfileRepository;
import tn.autocare.provider.repository.ProviderServiceRepository;
import tn.autocare.file.api.FileFacade;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.api.StoredFileDto;
import tn.autocare.shared.exception.AppException;

/** Public search over approved providers and their offered services. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProviderSearchService {

	private final ProviderProfileRepository profileRepository;

	private final ProviderServiceRepository providerServiceRepository;

	private final ServiceNames serviceNames;

	private final FileFacade fileFacade;

	public Page<ProviderSearchResult> searchProviders(@Nullable Long serviceId, @Nullable String governorate,
			@Nullable Boolean atHome, @Nullable String query, Pageable pageable) {
		return searchProviders(serviceId, governorate, atHome, query, null, pageable);
	}

	/**
	 * {@code near}: the client's position; results then come nearest first with their
	 * distance.
	 */
	public Page<ProviderSearchResult> searchProviders(@Nullable Long serviceId, @Nullable String governorate,
			@Nullable Boolean atHome, @Nullable String query, @Nullable Near near, Pageable pageable) {
		Page<ProviderProfile> page = profileRepository.searchVisibleProfiles(blankToNull(governorate),
				SearchText.toPrefixQuery(query), serviceId, atHome, near == null ? null : near.latitude(),
				near == null ? null : near.longitude(), near == null ? null : near.radiusKm(), pageable);
		Map<Long, List<ProviderService>> servicesByOrganization = providerServiceRepository
			.findAllByOrganizationIdIn(page.map(ProviderProfile::getOrganizationId).getContent())
			.stream()
			.collect(Collectors.groupingBy(ProviderService::getOrganizationId));
		Map<Long, String> names = serviceNames.activeServiceNames();
		List<Long> ids = page.map(ProviderProfile::getOrganizationId).getContent();
		Map<Long, URI> logos = fileFacade.findOwnerFileUrls(FileOwnerType.ORGANIZATION, ids, FilePurpose.LOGO);
		Map<Long, URI> covers = fileFacade.findOwnerFileUrls(FileOwnerType.ORGANIZATION, ids, FilePurpose.PHOTO);
		return page.map(profile -> {
			URI cover = covers.get(profile.getOrganizationId());
			return toResult(profile, servicesByOrganization.getOrDefault(profile.getOrganizationId(), List.of()), names,
					logos.get(profile.getOrganizationId()), cover == null ? List.of() : List.of(cover), near);
		});
	}

	public ProviderSearchResult getProviderProfile(Long organizationId) {
		ProviderProfile profile = profileRepository.findByOrganizationIdAndVisibleTrue(organizationId)
			.orElseThrow(() -> AppException.notFound("Provider", organizationId));
		URI logo = fileFacade.findOwnerFileUrls(FileOwnerType.ORGANIZATION, List.of(organizationId), FilePurpose.LOGO)
			.get(organizationId);
		List<URI> photos = fileFacade.listOwnerFiles(FileOwnerType.ORGANIZATION, organizationId, FilePurpose.PHOTO)
			.stream()
			.map(StoredFileDto::url)
			.toList();
		return toResult(profile, providerServiceRepository.findAllByOrganizationIdOrderByIdAsc(organizationId),
				serviceNames.activeServiceNames(), logo, photos, null);
	}

	private static ProviderSearchResult toResult(ProviderProfile profile, List<ProviderService> services,
			Map<Long, String> names, @Nullable URI logoUrl, List<URI> photoUrls, @Nullable Near near) {
		List<ProviderServiceResponse> offered = services.stream()
			.map(service -> ProviderOfferService.toResponse(service, names))
			.toList();
		return new ProviderSearchResult(profile.getOrganizationId(), profile.getName(), profile.getDescription(),
				profile.getPhone(), profile.getGovernorate(), profile.getCity(), profile.getAddress(),
				profile.getServiceZone(), logoUrl, photoUrls, profile.getLatitude(), profile.getLongitude(),
				profile.isApproximateLocation(), near == null ? null : near.distanceTo(profile), offered);
	}

	private static @Nullable String blankToNull(@Nullable String value) {
		return value == null || value.isBlank() ? null : value;
	}

}
