package tn.autocare.auth.service;

import java.net.URI;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;

import org.jspecify.annotations.Nullable;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import tn.autocare.auth.api.RoleNames;
import tn.autocare.auth.api.UserRegistered;
import tn.autocare.auth.dto.OAuthAccountResponse;
import tn.autocare.auth.dto.OAuthProviderResponse;
import tn.autocare.auth.entity.AuthTokenChannel;
import tn.autocare.auth.entity.OAuthAccount;
import tn.autocare.auth.entity.OAuthProfileData;
import tn.autocare.auth.entity.OAuthProvider;
import tn.autocare.auth.entity.SessionScope;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.OAuthAccountRepository;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.auth.config.OAuthProperties;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Sign-in and account linking with Google, Facebook, GitHub (redirect flow) and
 * Google/Apple ID tokens.
 *
 * <p>
 * Who is signing in: the linked provider account if there is one; otherwise an existing
 * user with the same e-mail, linked automatically only when the provider has verified
 * that e-mail; otherwise a new account (no password until the user sets one).
 */
@Service
@RequiredArgsConstructor
public class OAuthService {

	static final Duration STATE_VALIDITY = Duration.ofMinutes(10);

	private static final String STATE_KEY = "autocare:oauth:state:";

	private static final SecureRandom RANDOM = new SecureRandom();

	private final OAuthAccountRepository oauthAccountRepository;

	private final UserRepository userRepository;

	private final OAuthProviderClient providerClient;

	private final IdTokenVerifier idTokenVerifier;

	private final AuthService authService;

	private final EmailVerificationService emailVerificationService;

	private final AuthMails authMails;

	private final PasswordEncoder passwordEncoder;

	private final TokenService tokenService;

	private final StringRedisTemplate redis;

	private final ApplicationEventPublisher events;

	private final OAuthProperties oauth;

	/**
	 * Result of a provider callback: a session (login), a linked account, or an error
	 * code.
	 */
	public record CallbackResult(@Nullable AuthSession session, String redirectPath, @Nullable ErrorCode error,
			boolean linked) {
	}

	public List<OAuthProviderResponse> listEnabledProviders() {
		List<OAuthProviderResponse> providers = new ArrayList<>();
		for (OAuthProvider provider : OAuthProvider.values()) {
			if (isEnabled(provider)) {
				providers.add(new OAuthProviderResponse(provider.key(), provider.supportsRedirectFlow(),
						provider.supportsIdToken()));
			}
		}
		return providers;
	}

	public URI startLogin(String providerKey, @Nullable String redirectPath) {
		OAuthProvider provider = redirectProvider(providerKey);
		String state = saveState("LOGIN|" + safePath(redirectPath));
		return providerClient.authorizationUri(provider, state, callbackUri(provider));
	}

	public URI startLink(Long userId, String providerKey) {
		OAuthProvider provider = redirectProvider(providerKey);
		String state = saveState("LINK|" + userId);
		return providerClient.authorizationUri(provider, state, callbackUri(provider));
	}

	@Transactional(noRollbackFor = AppException.class)
	public CallbackResult handleCallback(String providerKey, @Nullable String code, @Nullable String state,
			@Nullable String providerError, ClientInfo client, Locale locale) {
		String saved = state == null ? null : redis.opsForValue().getAndDelete(STATE_KEY + state);
		if (saved == null) {
			return new CallbackResult(null, "/login", ErrorCode.OAUTH_STATE_INVALID, false);
		}
		String[] parts = saved.split("\\|", 2);
		boolean linking = parts[0].equals("LINK");
		String failurePath = linking ? "/account" : "/login";
		if (providerError != null || code == null) {
			return new CallbackResult(null, failurePath, ErrorCode.OAUTH_FAILED, linking);
		}
		try {
			OAuthProvider provider = redirectProvider(providerKey);
			OAuthProfileData profile = providerClient.exchangeCode(provider, code, callbackUri(provider));
			if (linking) {
				linkAccount(Long.valueOf(parts[1]), profile);
				return new CallbackResult(null, "/account", null, true);
			}
			User user = resolveUser(profile, locale);
			return new CallbackResult(authService.startSessionForUser(user, client, SessionScope.CUSTOMER), parts[1],
					null, false);
		}
		catch (AppException ex) {
			return new CallbackResult(null, failurePath, ex.getCode(), linking);
		}
	}

	@Transactional
	public AuthSession loginWithIdToken(String providerKey, String idToken, ClientInfo client, Locale locale) {
		OAuthProvider provider = OAuthProvider.fromKey(providerKey)
			.filter(OAuthProvider::supportsIdToken)
			.filter(this::isEnabled)
			.orElseThrow(OAuthService::disabled);
		User user = resolveUser(idTokenVerifier.verifyIdToken(provider, idToken), locale);
		return authService.startSessionForUser(user, client, SessionScope.CUSTOMER);
	}

	@Transactional(readOnly = true)
	public List<OAuthAccountResponse> listLinkedAccounts(Long userId) {
		return oauthAccountRepository.findAllByUserIdOrderByCreatedAtAsc(userId)
			.stream()
			.map(account -> new OAuthAccountResponse(account.getProvider().key(), account.getProviderEmail(),
					account.getDisplayName(), account.getCreatedAt(), account.getLastUsedAt()))
			.toList();
	}

	/** Refused when it would leave an account without any way to sign in. */
	@Transactional
	public void unlinkAccount(Long userId, String providerKey) {
		OAuthProvider provider = OAuthProvider.fromKey(providerKey).orElseThrow(OAuthService::disabled);
		OAuthAccount account = oauthAccountRepository.findByUserIdAndProvider(userId, provider)
			.orElseThrow(() -> AppException.notFound("Linked account", providerKey));
		User user = userRepository.findById(userId).orElseThrow(() -> AppException.notFound("User", userId));
		if (!user.isPasswordSet() && oauthAccountRepository.countByUserId(userId) <= 1) {
			throw new AppException(ErrorCode.OAUTH_LAST_LOGIN_METHOD, "Set a password before unlinking");
		}
		oauthAccountRepository.delete(account);
	}

	private void linkAccount(Long userId, OAuthProfileData profile) {
		oauthAccountRepository.findByProviderAndProviderAccountId(profile.provider(), profile.subject())
			.ifPresentOrElse(existing -> {
				if (!existing.getUserId().equals(userId)) {
					throw new AppException(ErrorCode.OAUTH_ACCOUNT_LINKED_ELSEWHERE, "Linked to another user");
				}
				existing.refresh(profile);
			}, () -> {
				if (oauthAccountRepository.findByUserIdAndProvider(userId, profile.provider()).isPresent()) {
					throw new AppException(ErrorCode.OAUTH_PROVIDER_ALREADY_LINKED, "Provider already linked");
				}
				oauthAccountRepository.save(OAuthAccount.link(userId, profile));
			});
	}

	private User resolveUser(OAuthProfileData profile, Locale locale) {
		var linked = oauthAccountRepository.findByProviderAndProviderAccountId(profile.provider(), profile.subject());
		if (linked.isPresent()) {
			linked.get().refresh(profile);
			return userRepository.findById(linked.get().getUserId())
				.orElseThrow(() -> AppException.notFound("User", linked.get().getUserId()));
		}
		if (profile.email() == null || profile.email().isBlank()) {
			throw new AppException(ErrorCode.OAUTH_EMAIL_REQUIRED, "The provider did not share an e-mail");
		}
		var existing = userRepository.findByEmailIgnoreCase(User.normalizeEmail(profile.email()));
		if (existing.isPresent()) {
			// An unverified provider e-mail could belong to anyone: never attach it to an
			// account.
			if (!profile.emailVerified()) {
				throw new AppException(ErrorCode.OAUTH_ACCOUNT_EXISTS, "An account exists with this e-mail");
			}
			oauthAccountRepository.save(OAuthAccount.link(existing.get().getId(), profile));
			return existing.get();
		}
		return createUser(profile, locale);
	}

	private User createUser(OAuthProfileData profile, Locale locale) {
		String name = profile.name() == null || profile.name().isBlank() ? profile.email().split("@")[0]
				: profile.name();
		User user = User.register(profile.email(), passwordEncoder.encode(tokenService.generateOpaqueToken()), name,
				null, locale);
		user.markPasswordNotSet();
		if (profile.emailVerified()) {
			user.markEmailVerified();
		}
		user = userRepository.save(user);
		authService.assignRole(user.getId(), RoleNames.USER);
		oauthAccountRepository.save(OAuthAccount.link(user.getId(), profile));
		events.publishEvent(new UserRegistered(user.getId(), user.getEmail(), user.getFullName()));
		if (profile.emailVerified()) {
			authMails.sendWelcome(user);
		}
		else {
			emailVerificationService.sendVerificationAfterRegistration(user, AuthTokenChannel.LINK);
		}
		return user;
	}

	private OAuthProvider redirectProvider(String key) {
		return OAuthProvider.fromKey(key)
			.filter(OAuthProvider::supportsRedirectFlow)
			.filter(this::isEnabled)
			.orElseThrow(OAuthService::disabled);
	}

	private boolean isEnabled(OAuthProvider provider) {
		OAuthProperties config = oauth;
		return switch (provider) {
			case GOOGLE -> config.google().enabled();
			case FACEBOOK -> config.facebook().enabled();
			case GITHUB -> config.github().enabled();
			case APPLE -> config.apple().enabled();
		};
	}

	private String callbackUri(OAuthProvider provider) {
		return oauth.redirectBaseUrl() + "/auth/oauth/" + provider.key() + "/callback";
	}

	private String saveState(String value) {
		byte[] bytes = new byte[24];
		RANDOM.nextBytes(bytes);
		String state = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
		redis.opsForValue().set(STATE_KEY + state, value, STATE_VALIDITY);
		return state;
	}

	/**
	 * Only in-app paths, so the redirect cannot be used to send users to another site.
	 */
	private static String safePath(@Nullable String path) {
		return path != null && path.startsWith("/") && !path.startsWith("//") && !path.contains("\\") ? path : "/";
	}

	private static AppException disabled() {
		return new AppException(ErrorCode.OAUTH_PROVIDER_DISABLED, "This sign-in method is not available");
	}

}
