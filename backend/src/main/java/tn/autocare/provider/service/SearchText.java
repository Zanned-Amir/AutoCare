package tn.autocare.provider.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.jspecify.annotations.Nullable;

/**
 * Turns text into the accent-free, lower-case words that the search index and queries
 * use.
 */
final class SearchText {

	private SearchText() {
	}

	static String normalize(@Nullable String text) {
		if (text == null) {
			return "";
		}
		String withoutAccents = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
		return withoutAccents.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
	}

	static String join(@Nullable String... parts) {
		return Stream.of(parts).filter(Objects::nonNull).map(SearchText::normalize).collect(Collectors.joining(" "));
	}

	/**
	 * "vidange marsa" becomes "vidange:* & marsa:*" (every word, prefix match). Null when
	 * empty.
	 */
	static @Nullable String toPrefixQuery(@Nullable String query) {
		String normalized = normalize(query);
		if (normalized.isEmpty()) {
			return null;
		}
		return Arrays.stream(normalized.split(" ")).map(word -> word + ":*").collect(Collectors.joining(" & "));
	}

}
