package tn.autocare.shared.sms;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** {@code provider}: {@code log} (dev) or {@code twilio}. */
@ConfigurationProperties(prefix = "autocare.sms")
public record SmsProperties(String provider, Twilio twilio) {

	public record Twilio(String accountSid, String authToken, String fromNumber) {
	}

}
