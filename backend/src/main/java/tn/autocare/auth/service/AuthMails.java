package tn.autocare.auth.service;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.FormatStyle;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.springframework.context.MessageSource;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.User;
import tn.autocare.shared.config.WebAppProperties;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;

/**
 * Every e-mail the auth module sends, in the recipient's language. Templates live in
 * resources/templates/mail/, their texts in i18n/messages*.properties under
 * mail.&lt;template&gt;.*.
 */
@Component
@RequiredArgsConstructor
class AuthMails {

	private static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

	private final MailService mailService;

	private final MessageSource messageSource;

	private final WebAppProperties webApp;

	void sendEmailVerification(User user, AuthTokenChannel channel, String token, Duration validity) {
		send(user, user.getEmail(), "verify-email", tokenVariables(user, channel, "/verify-email", token, validity));
	}

	void sendPasswordReset(User user, AuthTokenChannel channel, String token, Duration validity) {
		send(user, user.getEmail(), "reset-password",
				tokenVariables(user, channel, "/reset-password", token, validity));
	}

	void sendEmailChange(User user, String newEmail, String token, Duration validity) {
		Map<String, Object> variables = tokenVariables(user, AuthTokenChannel.LINK, "/confirm-email-change", token,
				validity);
		variables.put("newEmail", newEmail);
		send(user, newEmail, "change-email", variables);
	}

	void sendEmailChanged(User user, String previousEmail) {
		Map<String, Object> variables = base(user);
		variables.put("previousEmail", previousEmail);
		variables.put("newEmail", user.getEmail());
		variables.put("date", formatNow(user.preferredLocale()));
		variables.put("link", webApp.baseUrl() + "/account");
		send(user, previousEmail, "email-changed", variables);
		send(user, user.getEmail(), "email-changed", variables);
	}

	void sendPasswordChanged(User user) {
		Map<String, Object> variables = base(user);
		variables.put("date", formatNow(user.preferredLocale()));
		variables.put("link", webApp.baseUrl() + "/forgot-password");
		send(user, user.getEmail(), "password-changed", variables);
	}

	void sendNewDeviceLogin(User user, String device, String ipAddress) {
		Map<String, Object> variables = base(user);
		variables.put("device", device);
		variables.put("ip", ipAddress == null ? "—" : ipAddress);
		variables.put("date", formatNow(user.preferredLocale()));
		variables.put("link", webApp.baseUrl() + "/account");
		send(user, user.getEmail(), "new-device-login", variables);
	}

	void sendAccountInvitation(User user, String token, Duration validity) {
		send(user, user.getEmail(), "account-invitation",
				tokenVariables(user, AuthTokenChannel.LINK, "/reset-password", token, validity));
	}

	public void sendWelcome(User user) {
		Map<String, Object> variables = base(user);
		variables.put("link", webApp.baseUrl() + "/vehicles");
		send(user, user.getEmail(), "welcome", variables);
	}

	private Map<String, Object> tokenVariables(User user, AuthTokenChannel channel, String path, String token,
			Duration validity) {
		Map<String, Object> variables = base(user);
		variables.put("validity", describe(validity, user.preferredLocale()));
		if (channel == AuthTokenChannel.LINK) {
			variables.put("link",
					UriComponentsBuilder.fromUriString(webApp.baseUrl())
						.path(path)
						.queryParam("token", token)
						.build()
						.toUriString());
		}
		else {
			variables.put("code", token);
		}
		return variables;
	}

	private static Map<String, Object> base(User user) {
		Map<String, Object> variables = new HashMap<>();
		variables.put("name", user.getFullName());
		return variables;
	}

	private void send(User user, String to, String template, Map<String, Object> variables) {
		mailService.send(new MailMessage(to, user.preferredLocale(), template, Map.copyOf(variables)));
	}

	/** "15 minutes" / "24 heures" in the recipient's language. */
	String describe(Duration validity, Locale locale) {
		long minutes = validity.toMinutes();
		return minutes % 60 == 0 && minutes >= 60
				? messageSource.getMessage("mail.duration.hours", new Object[] { minutes / 60 }, locale)
				: messageSource.getMessage("mail.duration.minutes", new Object[] { minutes }, locale);
	}

	private static String formatNow(Locale locale) {
		return DateTimeFormatter.ofLocalizedDateTime(FormatStyle.LONG, FormatStyle.SHORT)
			.withLocale(locale)
			.withZone(TUNIS)
			.format(Instant.now());
	}

}
