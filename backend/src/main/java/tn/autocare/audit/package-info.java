/**
 * Append-only log of sensitive actions (approvals, suspensions, role and member changes,
 * catalog deactivations). Fed by other modules' events, read by the backoffice detail
 * pages.
 */
@ApplicationModule(displayName = "Audit")
package tn.autocare.audit;

import org.springframework.modulith.ApplicationModule;
