/**
 * Cross-cutting infrastructure: configuration, security, errors, persistence base types
 * and object storage. Not a business module. Every module may use it, and it never
 * depends on a business module.
 */
@ApplicationModule(displayName = "Shared", type = ApplicationModule.Type.OPEN)
package tn.autocare.shared;

import org.springframework.modulith.ApplicationModule;
