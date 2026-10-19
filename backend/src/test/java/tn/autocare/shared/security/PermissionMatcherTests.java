package tn.autocare.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class PermissionMatcherTests {

	@Test
	void grantsExactAndWildcardPermissions() {
		assertThat(PermissionMatcher.grants(List.of("request:read"), "request:read")).isTrue();
		assertThat(PermissionMatcher.grants(List.of("request:*"), "request:accept")).isTrue();
		assertThat(PermissionMatcher.grants(List.of("*:read"), "history:read")).isTrue();
		assertThat(PermissionMatcher.grants(List.of("*:*"), "member:manage")).isTrue();
	}

	@Test
	void refusesOtherPermissions() {
		assertThat(PermissionMatcher.grants(List.of("request:read"), "request:accept")).isFalse();
		assertThat(PermissionMatcher.grants(List.of("vehicle:*"), "request:read")).isFalse();
		assertThat(PermissionMatcher.grants(List.of(), "request:read")).isFalse();
	}

}
