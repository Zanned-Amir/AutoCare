package tn.autocare.organization.api;

import java.util.List;
import java.util.Optional;

/**
 * What other modules may ask the organization module. Implemented by
 * {@code tn.autocare.organization.service.OrganizationFacadeImpl}.
 */
public interface OrganizationFacade {

	Optional<OrganizationSummary> findOrganization(Long organizationId);

	OrganizationSummary getOrganization(Long organizationId);

	/**
	 * True when the user is an active member holding the permission (cached in Redis).
	 */
	/** Opening hours and slot settings, for bookings. */
	BookingSchedule getBookingSchedule(Long organizationId);

	boolean hasMemberPermission(Long organizationId, Long userId, String permission);

	/**
	 * User ids of the active members holding the permission, e.g. who to notify of a new
	 * request.
	 */
	List<Long> listMemberUserIdsWithPermission(Long organizationId, String permission);

}
