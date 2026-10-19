package tn.autocare.auth.entity;

import org.jspecify.annotations.Nullable;

/** Phone numbers in E.164. Eight digits are a Tunisian number (+216). */
public final class PhoneNumbers {

	private PhoneNumbers() {
	}

	public static @Nullable String normalize(@Nullable String phone) {
		if (phone == null || phone.isBlank()) {
			return null;
		}
		String digits = phone.replaceAll("[^0-9]", "");
		if (phone.trim().startsWith("+")) {
			return "+" + digits;
		}
		if (digits.length() == 8) {
			return "+216" + digits;
		}
		if (digits.startsWith("00")) {
			return "+" + digits.substring(2);
		}
		return "+" + digits;
	}

}
