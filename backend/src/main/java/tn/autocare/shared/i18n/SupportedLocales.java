package tn.autocare.shared.i18n;

import java.util.List;
import java.util.Locale;

import org.jspecify.annotations.Nullable;

/**
 * Languages the API and e-mails speak. French is the default (Tunisia); English is the
 * alternative.
 */
public final class SupportedLocales {

	public static final Locale FRENCH = Locale.FRENCH;

	public static final Locale ENGLISH = Locale.ENGLISH;

	public static final List<Locale> ALL = List.of(FRENCH, ENGLISH);

	private SupportedLocales() {
	}

	/** "en", "en-GB" -> English; anything else (null, "fr", "ar") -> French. */
	public static Locale fromTag(@Nullable String tag) {
		return tag != null && tag.toLowerCase().startsWith("en") ? ENGLISH : FRENCH;
	}

	/** The value stored in users.locale. */
	public static String toTag(Locale locale) {
		return ENGLISH.getLanguage().equals(locale.getLanguage()) ? "en" : "fr";
	}

}
