package tn.autocare.apiaccess.controller;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.apiaccess.dto.ApiCapabilityResponse;
import tn.autocare.apiaccess.dto.ApiKeyResponse;
import tn.autocare.apiaccess.dto.ApiKeySecretResponse;
import tn.autocare.apiaccess.dto.ApiKeyUsageResponse;
import tn.autocare.apiaccess.dto.ChangeApiKeyStatusRequest;
import tn.autocare.apiaccess.dto.CreateApiKeyRequest;
import tn.autocare.apiaccess.dto.RevokeApiKeyRequest;
import tn.autocare.apiaccess.dto.UpdateApiKeyRequest;
import tn.autocare.apiaccess.service.ApiKeyService;
import tn.autocare.shared.security.CurrentUser;

@Tag(name = "Admin - API keys")
@RestController
@RequestMapping("/admin/api-keys")
@RequiredArgsConstructor
@PreAuthorize("@perm.has('" + AdminApiKeyController.MANAGE + "')")
public class AdminApiKeyController {

	static final String MANAGE = "apikey:manage";

	private final ApiKeyService apiKeyService;

	@GetMapping("/capabilities")
	public List<ApiCapabilityResponse> listApiCapabilities() {
		return apiKeyService.listCapabilities();
	}

	@GetMapping
	public PagedModel<ApiKeyResponse> listApiKeys(
			@PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
		return new PagedModel<>(apiKeyService.listApiKeys(pageable));
	}

	@GetMapping("/{id}")
	public ApiKeyResponse getApiKey(@PathVariable Long id) {
		return apiKeyService.getApiKey(id);
	}

	@GetMapping("/{id}/usage")
	public List<ApiKeyUsageResponse> getApiKeyUsage(@PathVariable Long id,
			@RequestParam(defaultValue = "30") int days) {
		return apiKeyService.getApiKeyUsage(id, Math.max(1, Math.min(days, 90)));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiKeySecretResponse createApiKey(@Valid @RequestBody CreateApiKeyRequest request) {
		return apiKeyService.createApiKey(CurrentUser.id(), request);
	}

	@PutMapping("/{id}")
	public ApiKeyResponse updateApiKey(@PathVariable Long id, @Valid @RequestBody UpdateApiKeyRequest request) {
		return apiKeyService.updateApiKey(id, request);
	}

	@PatchMapping("/{id}/status")
	public ApiKeyResponse changeApiKeyStatus(@PathVariable Long id,
			@Valid @RequestBody ChangeApiKeyStatusRequest request) {
		return apiKeyService.changeApiKeyStatus(id, request.status());
	}

	@PostMapping("/{id}/rotate")
	public ApiKeySecretResponse rotateApiKey(@PathVariable Long id) {
		return apiKeyService.rotateApiKey(id);
	}

	@PostMapping("/{id}/revoke")
	public ApiKeyResponse revokeApiKey(@PathVariable Long id,
			@Valid @RequestBody(required = false) RevokeApiKeyRequest request) {
		return apiKeyService.revokeApiKey(id, request == null ? null : request.reason());
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteApiKey(@PathVariable Long id) {
		apiKeyService.deleteApiKey(id);
	}

}
