package tn.autocare.shared.mail;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Locale;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.context.support.ResourceBundleMessageSource;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import tn.autocare.shared.i18n.SupportedLocales;

/**
 * Renders every e-mail template in French and English, so a broken expression or a
 * missing translation fails the build instead of a real e-mail.
 */
class MailTemplatesTests {

	private static final Locale FR = SupportedLocales.FRENCH;

	private static final Locale EN = SupportedLocales.ENGLISH;

	private final SpringTemplateEngine engine = createEngine();

	@Test
	void rendersLinkAndCodeVariantsOfVerificationAndReset() {
		for (String template : new String[] { "verify-email", "reset-password" }) {
			assertThat(render(template, FR,
					Map.of("name", "Sami", "link", "http://web/x?token=abc", "validity", "15 minutes")))
				.contains("Bonjour Sami", "http://web/x?token=abc", "Valable 15 minutes")
				.doesNotContain("Votre code");
			assertThat(render(template, EN, Map.of("name", "Sami", "code", "482913", "validity", "15 minutes")))
				.contains("Hello Sami", "482913", "Never share this code")
				.doesNotContain("http://web/x");
		}
	}

	@Test
	void rendersAccountNotices() {
		assertThat(render("change-email", FR,
				Map.of("name", "Sami", "newEmail", "n@x.tn", "link", "http://web/c?token=t", "validity", "15 minutes")))
			.contains("http://web/c?token=t", "Confirmez que n@x.tn");
		assertThat(render("email-changed", EN, Map.of("name", "Sami", "previousEmail", "old@x.tn", "newEmail",
				"new@x.tn", "date", "today", "link", "http://web/account")))
			.contains("Previous address", "old@x.tn", "new@x.tn");
		assertThat(render("password-changed", FR,
				Map.of("name", "Sami", "date", "18 octobre 2026", "link", "http://web/forgot-password")))
			.contains("modifié le 18 octobre 2026", "http://web/forgot-password");
		assertThat(
				render("new-device-login", EN,
						Map.of("name", "Sami", "device", "Chrome · Windows", "ip", "10.0.0.1", "date", "today", "link",
								"http://web/account")))
			.contains("New sign-in detected", "Chrome · Windows", "10.0.0.1");
		assertThat(render("welcome", FR, Map.of("name", "Sami", "link", "http://web/vehicles")))
			.contains("Bienvenue sur AutoCare TN", "Ajoutez votre véhicule", "http://web/vehicles");
	}

	@Test
	void rendersAccountInvitation() {
		assertThat(render("account-invitation", FR,
				Map.of("name", "Sami", "link", "http://web/reset-password?token=abc", "validity", "3 jours")))
			.contains("Bonjour Sami", "vous a ouvert un compte", "http://web/reset-password?token=abc",
					"Valable 3 jours");
		assertThat(render("account-invitation", EN,
				Map.of("name", "Sami", "link", "http://web/reset-password?token=abc", "validity", "3 days")))
			.contains("Hello Sami", "Choose my password", "Valid for 3 days");
	}

	@Test
	void rendersHelpdeskEmails() {
		assertThat(render("helpdesk-ticket-reply", FR,
				Map.of("name", "Sami", "ticketId", "TK-7K3M9QX2", "subject", "Garage absent", "excerpt",
						"Nous avons contacté le garage.", "link", "http://web/support/TK-7K3M9QX2")))
			.contains("TK-7K3M9QX2", "Garage absent", "Nous avons contacté le garage.");
		assertThat(render("helpdesk-ticket-resolved", EN, Map.of("name", "Sami", "ticketId", "TK-7K3M9QX2", "subject",
				"Garage absent", "link", "http://web/support/TK-7K3M9QX2")))
			.contains("Request resolved", "Reply within 7 days");
	}

	@Test
	void layoutCarriesLanguageAndFooter() {
		String html = render("welcome", EN, Map.of("name", "Sami", "link", "http://web/vehicles"));
		assertThat(html).contains("lang=\"en\"", "Car care in Tunisia", "support@autocare.tn", "http://web/account");
		// Security e-mails are minimal: no marketing tagline.
		assertThat(render("password-changed", EN, Map.of("name", "Sami", "date", "x", "link", "y")))
			.doesNotContain("Car care in Tunisia");
	}

	private String render(String template, Locale locale, Map<String, Object> variables) {
		Context context = new Context(locale);
		context.setVariables(variables);
		context.setVariable("webUrl", "http://web");
		context.setVariable("supportEmail", "support@autocare.tn");
		context.setVariable("year", 2026);
		return engine.process("mail/" + template, context);
	}

	private static SpringTemplateEngine createEngine() {
		ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
		resolver.setPrefix("templates/");
		resolver.setSuffix(".html");
		resolver.setTemplateMode(TemplateMode.HTML);
		resolver.setCharacterEncoding("UTF-8");
		ResourceBundleMessageSource messages = new ResourceBundleMessageSource();
		messages.setBasename("i18n/messages");
		messages.setDefaultEncoding("UTF-8");
		messages.setFallbackToSystemLocale(false);
		// A missing key must fail the test, not render "??key_fr??".
		messages.setUseCodeAsDefaultMessage(false);
		SpringTemplateEngine engine = new SpringTemplateEngine();
		engine.setTemplateResolver(resolver);
		engine.setTemplateEngineMessageSource(messages);
		return engine;
	}

}
