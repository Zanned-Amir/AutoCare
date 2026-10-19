package tn.autocare.catalog.api;

import java.util.List;
import java.util.Optional;

/**
 * What other modules may ask the catalog. Implemented by
 * {@code tn.autocare.catalog.service.CatalogFacadeImpl}; becomes an HTTP client when
 * catalog is extracted into its own service.
 */
public interface CatalogFacade {

	List<AutoServiceDto> listActiveAutoServices();

	Optional<AutoServiceDto> findAutoService(Long autoServiceId);

	AutoServiceDto getAutoService(Long autoServiceId);

	boolean existsActiveAutoService(Long autoServiceId);

}
