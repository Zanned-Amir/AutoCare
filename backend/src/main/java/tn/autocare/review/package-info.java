/**
 * Ratings and comments on providers, one per completed request, with the provider's
 * reply. Checks completion through ServiceRequestFacade; nothing depends on this module
 * except through its endpoints (provider search fetches ratings by id, so provider and
 * review stay acyclic).
 */
@ApplicationModule(displayName = "Review")
package tn.autocare.review;

import org.springframework.modulith.ApplicationModule;
