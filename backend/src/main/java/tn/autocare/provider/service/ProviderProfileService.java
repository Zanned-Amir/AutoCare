package tn.autocare.provider.service;

import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.Governorates;
import tn.autocare.organization.api.OrganizationProfileChanged;
import tn.autocare.organization.api.OrganizationStatus;
import tn.autocare.organization.api.OrganizationType;
import tn.autocare.provider.entity.ProviderProfile;
import tn.autocare.provider.entity.ProviderService;
import tn.autocare.provider.repository.ProviderProfileRepository;
import tn.autocare.provider.repository.ProviderServiceRepository;

/** Keeps the local profile copy and its search text in sync. */
@Service
@RequiredArgsConstructor
public class ProviderProfileService {

	private final ProviderProfileRepository profileRepository;

	private final ProviderServiceRepository providerServiceRepository;

	private final ServiceNames serviceNames;

	@Transactional
	public void syncProfile(OrganizationProfileChanged event) {
		// Create-then-approve sends two events handled at once: insert safely, then lock.
		profileRepository.insertIfMissing(event.organizationId(), event.name(), event.phone(), event.governorate(),
				event.city());
		ProviderProfile profile = profileRepository.lockByOrganizationId(event.organizationId()).orElseThrow();
		if (!profile.acceptsChangeAt(event.changedAt())) {
			return;
		}
		boolean visible = event.type() == OrganizationType.PROVIDER && event.status() == OrganizationStatus.APPROVED;
		profile.sync(event.name(), event.description(), event.phone(), event.governorate(), event.city(),
				event.address(), event.serviceZone(), visible);
		if (event.latitude() != null) {
			profile.locate(event.latitude(), event.longitude(), false);
		}
		else {
			Governorates.locate(event.governorate())
				.ifPresentOrElse(centre -> profile.locate(centre.latitude(), centre.longitude(), true),
						() -> profile.locate(null, null, true));
		}
		profile.updateSearchText(buildSearchText(profile));
		profileRepository.save(profile);
	}

	/**
	 * Offered service names are part of the search text, so "vidange" finds providers
	 * offering it.
	 */
	@Transactional
	public void reindexProfile(Long organizationId) {
		profileRepository.findByOrganizationId(organizationId)
			.ifPresent(profile -> profile.updateSearchText(buildSearchText(profile)));
	}

	private String buildSearchText(ProviderProfile profile) {
		Map<Long, String> names = serviceNames.activeServiceNames();
		String offered = providerServiceRepository.findAllByOrganizationIdOrderByIdAsc(profile.getOrganizationId())
			.stream()
			.map(ProviderService::getServiceId)
			.map(ServiceNames.lookup(names))
			.reduce("", (a, b) -> a + " " + b);
		return SearchText.join(profile.getName(), profile.getCity(), profile.getGovernorate(), profile.getServiceZone(),
				profile.getDescription(), offered);
	}

}
