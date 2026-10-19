package tn.autocare.provider.service;

import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import tn.autocare.catalog.api.AutoServiceDto;
import tn.autocare.catalog.api.CatalogFacade;

/** Catalog service names by id, read through the catalog facade (cached there). */
@Component
@RequiredArgsConstructor
class ServiceNames {

	private final CatalogFacade catalogFacade;

	Map<Long, String> activeServiceNames() {
		return catalogFacade.listActiveAutoServices()
			.stream()
			.collect(Collectors.toMap(AutoServiceDto::id, AutoServiceDto::name, (a, b) -> a));
	}

	static Function<Long, String> lookup(Map<Long, String> names) {
		return id -> names.getOrDefault(id, "Service " + id);
	}

}
