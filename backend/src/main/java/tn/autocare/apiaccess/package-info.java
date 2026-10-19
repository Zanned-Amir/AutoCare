/**
 * API keys for partners (template: platform/api-access): hashed keys with permissions, IP
 * allowlist, per-minute rate limit, daily usage metering and rotation, plus the
 * /external/v1 API they unlock.
 */
@ApplicationModule(displayName = "API access")
package tn.autocare.apiaccess;

import org.springframework.modulith.ApplicationModule;
