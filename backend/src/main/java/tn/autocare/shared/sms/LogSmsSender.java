package tn.autocare.shared.sms;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Dev provider: writes the SMS to the API log instead of sending it
 * (autocare.sms.provider=log).
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "autocare.sms", name = "provider", havingValue = "log", matchIfMissing = true)
class LogSmsSender implements SmsSender {

	@Override
	public void sendSms(String to, String text) {
		log.info("[SMS to {}] {}", to, text);
	}

}
