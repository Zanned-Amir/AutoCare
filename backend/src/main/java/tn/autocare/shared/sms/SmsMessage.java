package tn.autocare.shared.sms;

import java.util.List;
import java.util.Locale;

/**
 * An SMS to send. The text is the message {@code sms.<template>} from i18n/messages in
 * {@code locale}, with {@code args} as its {0}, {1}... placeholders. Keep it short: one
 * SMS is 160 GSM characters.
 */
public record SmsMessage(String to, Locale locale, String template, List<Object> args) {
}
