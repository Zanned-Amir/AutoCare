package tn.autocare.provider.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.provider.api.ProviderPermissions;
import tn.autocare.provider.dto.OfferProviderServiceRequest;
import tn.autocare.provider.dto.ProviderServiceResponse;
import tn.autocare.provider.dto.UpdateProviderServiceRequest;
import tn.autocare.provider.service.ProviderOfferService;

/** A provider organization's own offer, in its workspace. */
@Tag(name = "Provider services")
@RestController
@RequestMapping("/organizations/{organizationId}/services")
@RequiredArgsConstructor
public class ProviderServiceController {

	private static final String CAN_READ = "@orgPerm.has(#organizationId, '" + ProviderPermissions.SERVICE_READ + "')";

	private static final String CAN_MANAGE = "@orgPerm.has(#organizationId, '" + ProviderPermissions.SERVICE_MANAGE
			+ "')";

	private final ProviderOfferService providerOfferService;

	@GetMapping
	@PreAuthorize(CAN_READ)
	public List<ProviderServiceResponse> listProviderServices(@PathVariable Long organizationId) {
		return providerOfferService.listProviderServices(organizationId);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@PreAuthorize(CAN_MANAGE)
	public ProviderServiceResponse offerProviderService(@PathVariable Long organizationId,
			@Valid @RequestBody OfferProviderServiceRequest request) {
		return providerOfferService.offerProviderService(organizationId, request);
	}

	@PutMapping("/{providerServiceId}")
	@PreAuthorize(CAN_MANAGE)
	public ProviderServiceResponse updateProviderService(@PathVariable Long organizationId,
			@PathVariable Long providerServiceId, @Valid @RequestBody UpdateProviderServiceRequest request) {
		return providerOfferService.updateProviderService(organizationId, providerServiceId, request);
	}

	@DeleteMapping("/{providerServiceId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@PreAuthorize(CAN_MANAGE)
	public void removeProviderService(@PathVariable Long organizationId, @PathVariable Long providerServiceId) {
		providerOfferService.removeProviderService(organizationId, providerServiceId);
	}

}
