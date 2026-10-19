package tn.autocare.shared.sms;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/** Twilio Messages API over plain HTTP (no SDK). autocare.sms.provider=twilio. */
@Component
@ConditionalOnProperty(prefix = "autocare.sms", name = "provider", havingValue = "twilio")
class TwilioSmsSender implements SmsSender {

	private final RestClient restClient;

	private final SmsProperties.Twilio twilio;

	TwilioSmsSender(RestClient.Builder builder, SmsProperties properties) {
		this.twilio = properties.twilio();
		if (twilio.accountSid() == null || twilio.accountSid().isBlank()) {
			throw new IllegalStateException("autocare.sms.provider=twilio needs autocare.sms.twilio.* values");
		}
		this.restClient = builder.baseUrl("https://api.twilio.com/2010-04-01/Accounts/" + twilio.accountSid())
			.defaultHeaders(headers -> headers.setBasicAuth(twilio.accountSid(), twilio.authToken()))
			.build();
	}

	@Override
	public void sendSms(String to, String text) {
		MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
		form.add("To", to);
		form.add("From", twilio.fromNumber());
		form.add("Body", text);
		restClient.post()
			.uri("/Messages.json")
			.contentType(MediaType.APPLICATION_FORM_URLENCODED)
			.body(form)
			.retrieve()
			.toBodilessEntity();
	}

}
