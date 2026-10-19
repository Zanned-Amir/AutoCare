package tn.autocare.auth.entity;

import java.time.Instant;
import java.util.Locale;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import tn.autocare.shared.i18n.SupportedLocales;
import tn.autocare.shared.persistence.BaseEntity;

@Getter
@Entity
@Table(schema = "auth", name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseEntity {

	@Column(nullable = false, length = 254)
	private String email;

	@Column(name = "password_hash", nullable = false, length = 100)
	private String passwordHash;

	@Column(name = "full_name", nullable = false, length = 120)
	private String fullName;

	@Column(length = 30)
	private String phone;

	/** "fr" or "en": the language of the e-mails this user receives. */
	@Column(nullable = false, length = 5)
	private String locale;

	/** False when suspended by an admin or deactivated by the user: login is refused. */
	@Column(nullable = false)
	private boolean active;

	@Column(name = "email_verified", nullable = false)
	private boolean emailVerified;

	@Column(name = "phone_verified", nullable = false)
	private boolean phoneVerified;

	/** False for accounts created through OAuth until the user chooses a password. */
	@Column(name = "password_set", nullable = false)
	private boolean passwordSet;

	/** Empty until the welcome flow after sign-up is finished or skipped. */
	@Enumerated(EnumType.STRING)
	@Column(name = "onboarding_state", length = 20)
	private OnboardingState onboardingState;

	@Column(name = "onboarding_finished_at")
	private Instant onboardingFinishedAt;

	public static User register(String email, String passwordHash, String fullName, String phone, Locale locale) {
		User user = new User();
		user.email = normalizeEmail(email);
		user.passwordHash = passwordHash;
		user.active = true;
		user.passwordSet = true;
		user.locale = SupportedLocales.toTag(locale);
		user.updateProfile(fullName, phone);
		return user;
	}

	public void updateProfile(String fullName, String phone) {
		this.fullName = fullName.trim();
		String normalized = PhoneNumbers.normalize(phone);
		// A new number has to be verified again.
		if (normalized == null ? this.phone != null : !normalized.equals(this.phone)) {
			this.phoneVerified = false;
		}
		this.phone = normalized;
	}

	/** The first answer wins: replaying the call (two tabs) changes nothing. */
	public void finishOnboarding(boolean skipped, Instant now) {
		if (onboardingState == null) {
			this.onboardingState = skipped ? OnboardingState.SKIPPED : OnboardingState.COMPLETED;
			this.onboardingFinishedAt = now;
		}
	}

	public boolean isOnboardingDone() {
		return onboardingState != null;
	}

	public void markPhoneVerified() {
		this.phoneVerified = true;
	}

	/** OAuth sign-up: the account has no password the user knows yet. */
	public void markPasswordNotSet() {
		this.passwordSet = false;
	}

	public void changeLocale(Locale locale) {
		this.locale = SupportedLocales.toTag(locale);
	}

	public Locale preferredLocale() {
		return SupportedLocales.fromTag(locale);
	}

	public void changePassword(String passwordHash) {
		this.passwordHash = passwordHash;
		this.passwordSet = true;
	}

	/** The new address was proven by clicking the link sent to it. */
	public void changeEmail(String newEmail) {
		this.email = normalizeEmail(newEmail);
		this.emailVerified = true;
	}

	public void markEmailVerified() {
		this.emailVerified = true;
	}

	public void deactivate() {
		this.active = false;
	}

	public void activate() {
		this.active = true;
	}

	public static String normalizeEmail(String email) {
		return email.trim().toLowerCase();
	}

}
