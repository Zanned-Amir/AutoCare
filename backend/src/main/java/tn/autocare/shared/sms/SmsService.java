package tn.autocare.shared.sms;

import org.springframework.context.MessageSource;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.shared.tx.AfterCommit;

/**
 * Sends SMS after the transaction commits, in the background, through the configured
 * provider.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SmsService {

	private final AsyncSmsDispatcher dispatcher;

	public void send(SmsMessage message) {
		AfterCommit.run(() -> dispatcher.dispatch(message));
	}

	@Service
	@RequiredArgsConstructor
	static class AsyncSmsDispatcher {

		private final SmsSender smsSender;

		private final MessageSource messageSource;

		@Async
		public void dispatch(SmsMessage message) {
			try {
				String text = messageSource.getMessage("sms." + message.template(), message.args().toArray(),
						message.locale());
				smsSender.sendSms(message.to(), text);
			}
			catch (RuntimeException ex) {
				log.error("Could not send SMS '{}' to {}", message.template(), message.to(), ex);
			}
		}

	}

}
