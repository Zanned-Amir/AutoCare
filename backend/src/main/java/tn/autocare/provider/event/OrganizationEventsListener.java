package tn.autocare.provider.event;

import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.organization.api.OrganizationProfileChanged;
import tn.autocare.provider.service.ProviderProfileService;

/**
 * Runs after the organization's transaction commits, in its own transaction. If it fails,
 * the Modulith event registry keeps the event and retries it on restart.
 */
@Component
@RequiredArgsConstructor
class OrganizationEventsListener {

	private final ProviderProfileService profileService;

	@ApplicationModuleListener
	void on(OrganizationProfileChanged event) {
		profileService.syncProfile(event);
	}

}
