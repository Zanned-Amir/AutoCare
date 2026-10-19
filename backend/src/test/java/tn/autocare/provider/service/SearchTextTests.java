package tn.autocare.provider.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SearchTextTests {

	@Test
	void removesAccentsAndPunctuation() {
		assertThat(SearchText.normalize("Électricité, Béja!")).isEqualTo("electricite beja");
	}

	@Test
	void buildsPrefixQueryOnEveryWord() {
		assertThat(SearchText.toPrefixQuery("Vidange  Marsa")).isEqualTo("vidange:* & marsa:*");
		assertThat(SearchText.toPrefixQuery("  ")).isNull();
		assertThat(SearchText.toPrefixQuery("a' | b")).isEqualTo("a:* & b:*");
	}

}
