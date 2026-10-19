package tn.autocare.shared.mail;

import java.util.Locale;
import java.util.Map;

/**
 * An e-mail to send. {@code template} is a Thymeleaf template under
 * {@code resources/templates/mail/}; its subject is the message
 * {@code mail.<template>.subject}. Texts come from i18n/messages in {@code locale} (the
 * recipient's language).
 */
public record MailMessage(String to, Locale locale, String template, Map<String, Object> variables) {
}
