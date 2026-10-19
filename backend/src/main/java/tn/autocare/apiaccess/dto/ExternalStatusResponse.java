package tn.autocare.apiaccess.dto;

import java.time.Instant;
import java.util.List;

/** GET /external/v1/status: the service is up and this is the key you are using. */
public record ExternalStatusResponse(String status, Instant serverTime, String keyLabel, String environment,
		List<String> permissions) {
}
