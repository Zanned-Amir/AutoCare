/**
 * Services offered by provider organizations, and public provider search. Search reads a
 * local copy of organization profiles (provider_profiles) kept up to date from
 * OrganizationProfileChanged events, so it never reads the organization module's tables.
 */
@ApplicationModule(displayName = "Provider")
package tn.autocare.provider;

import org.springframework.modulith.ApplicationModule;
