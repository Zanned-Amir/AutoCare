package tn.autocare.shared.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.LocaleResolver;
import org.springframework.web.servlet.i18n.AcceptHeaderLocaleResolver;

import tn.autocare.shared.i18n.SupportedLocales;

/**
 * The request language comes from the Accept-Language header (fr or en, French by
 * default). It drives API error messages and validation messages; e-mails use the user's
 * saved language instead.
 */
@Configuration
public class I18nConfig {

	@Bean
	LocaleResolver localeResolver() {
		AcceptHeaderLocaleResolver resolver = new AcceptHeaderLocaleResolver();
		resolver.setSupportedLocales(SupportedLocales.ALL);
		resolver.setDefaultLocale(SupportedLocales.FRENCH);
		return resolver;
	}

}
