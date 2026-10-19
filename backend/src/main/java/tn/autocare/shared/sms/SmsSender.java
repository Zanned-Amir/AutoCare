package tn.autocare.shared.sms;

/** Provider port (template: SmsProviderFactory). */
public interface SmsSender {

	void sendSms(String to, String text);

}
