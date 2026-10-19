package tn.autocare.catalog.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.service.CatalogService;

@Tag(name = "Catalog")
@RestController
@RequestMapping("/catalog/services")
@RequiredArgsConstructor
public class CatalogController {

	private final CatalogService catalogService;

	@GetMapping
	public List<AutoServiceDto> listActiveAutoServices() {
		return catalogService.listActiveAutoServices();
	}

	@GetMapping("/{autoServiceId}")
	public AutoServiceDto getAutoService(@PathVariable Long autoServiceId) {
		return catalogService.getAutoService(autoServiceId);
	}

}
