/**
 * Catalog of automotive services (oil change, brakes, tires...). Reference module: copy
 * its layout.
 *
 * <pre>
 * api/         public contract for other modules (facade, DTOs, permissions) = NestJS "exports"
 * controller/  HTTP endpoints
 * dto/         request bodies with validation
 * entity/      JPA entities
 * repository/  Spring Data repositories
 * mapper/      entity to DTO mapping (MapStruct)
 * service/     business logic + facade implementation
 * config/      module beans (caches)
 * </pre>
 *
 * Everything except {@code api} is private to the module (checked by ModularityTests).
 */
@ApplicationModule(displayName = "Catalog")
package tn.autocare.catalog;

import org.springframework.modulith.ApplicationModule;
