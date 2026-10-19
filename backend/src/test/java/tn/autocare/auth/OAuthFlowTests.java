package tn.autocare.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.net.URI;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.util.UriComponentsBuilder;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;
import tn.autocare.TestcontainersConfiguration;
import tn.autocare.auth.entity.OAuthProfileData;
import tn.autocare.auth.entity.OAuthProvider;
import tn.autocare.auth.service.IdTokenVerifier;
import tn.autocare.auth.service.OAuthProviderClient;

/**
 * OAuth sign-in and linking (template: identity/oauth). Providers are mocked; the rest is
 * real.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = { "autocare.oauth.google.client-id=google-web", "autocare.oauth.github.client-id=gh",
		"autocare.oauth.apple.client-ids=tn.autocare.app", "autocare.web.base-url=http://web" })
class OAuthFlowTests {

	@Autowired
	MockMvc mvc;

	@MockitoBean
	OAuthProviderClient providerClient;

	@MockitoBean
	IdTokenVerifier idTokenVerifier;

	@BeforeEach
	void authorizeUrlEchoesState() {
		when(providerClient.authorizationUri(any(), anyString(), anyString()))
			.thenAnswer(call -> URI.create("https://provider.test/authorize?state=" + call.getArgument(1)));
	}

	@Test
	void listsOnlyConfiguredProviders() throws Exception {
		mvc.perform(get("/auth/oauth/providers"))
			.andExpect(jsonPath("$[*].provider")
				.value(org.hamcrest.Matchers.containsInAnyOrder("google", "github", "apple")));
		mvc.perform(get("/auth/oauth/facebook/authorize")).andExpect(status().isNotFound());
	}

	@Test
	void signsUpWithGoogleThenSignsInAgainAsTheSameUser() throws Exception {
		String email = UUID.randomUUID() + "@gmail.com";
		String subject = UUID.randomUUID().toString();
		profileFor(OAuthProvider.GOOGLE, subject, email, true);

		MvcResult callback = loginThroughProvider("google", "/vehicles");
		assertThat(callback.getResponse().getRedirectedUrl()).isEqualTo("http://web/oauth/callback?redirect=/vehicles");
		Cookie cookie = callback.getResponse().getCookie("autocare_refresh");
		mvc.perform(post("/auth/c/refresh").cookie(cookie))
			.andExpect(jsonPath("$.user.email").value(email))
			.andExpect(jsonPath("$.user.emailVerified").value(true))
			.andExpect(jsonPath("$.user.passwordSet").value(false));

		MvcResult again = loginThroughProvider("google", null);
		String token = accessToken(again.getResponse().getCookie("autocare_refresh"));
		mvc.perform(get("/me/oauth").header("Authorization", token)).andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void linksAnExistingAccountOnlyWhenTheProviderVerifiedTheEmail() throws Exception {
		String email = register();
		profileFor(OAuthProvider.GITHUB, UUID.randomUUID().toString(), email, false);
		assertThat(loginThroughProvider("github", null).getResponse().getRedirectedUrl())
			.isEqualTo("http://web/oauth/callback?error=OAUTH_ACCOUNT_EXISTS");

		profileFor(OAuthProvider.GITHUB, UUID.randomUUID().toString(), email, true);
		assertThat(loginThroughProvider("github", null).getResponse().getCookie("autocare_refresh")).isNotNull();
	}

	@Test
	void refusesAnUnknownState() throws Exception {
		mvc.perform(get("/auth/oauth/google/callback").param("code", "c").param("state", "forged"))
			.andExpect(status().isFound())
			.andExpect(result -> assertThat(result.getResponse().getRedirectedUrl())
				.isEqualTo("http://web/oauth/callback?error=OAUTH_STATE_INVALID"));
	}

	@Test
	void signsInWithAnAppleIdTokenInHeaderMode() throws Exception {
		String email = UUID.randomUUID() + "@privaterelay.appleid.com";
		when(idTokenVerifier.verifyIdToken(eq(OAuthProvider.APPLE), eq("apple-id-token"))).thenReturn(
				new OAuthProfileData(OAuthProvider.APPLE, UUID.randomUUID().toString(), email, true, null, null));
		mvc.perform(post("/auth/h/oauth/apple/id-token").contentType(MediaType.APPLICATION_JSON)
			.content("{\"idToken\":\"apple-id-token\"}"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.refreshToken").isString())
			.andExpect(jsonPath("$.user.email").value(email));
	}

	@Test
	void linksAndUnlinksProvidersWithoutLockingTheUserOut() throws Exception {
		// An OAuth-only account cannot unlink its only way in until it sets a password.
		String email = UUID.randomUUID() + "@gmail.com";
		profileFor(OAuthProvider.GOOGLE, UUID.randomUUID().toString(), email, true);
		String token = accessToken(loginThroughProvider("google", null).getResponse().getCookie("autocare_refresh"));
		mvc.perform(delete("/me/oauth/google").header("Authorization", token))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("OAUTH_LAST_LOGIN_METHOD"));

		String linkUrl = JsonPath.read(mvc.perform(post("/me/oauth/github/link").header("Authorization", token))
			.andReturn()
			.getResponse()
			.getContentAsString(), "$.url");
		profileFor(OAuthProvider.GITHUB, UUID.randomUUID().toString(), "other@users.noreply.github.com", true);
		MvcResult linked = mvc
			.perform(get("/auth/oauth/github/callback").param("code", "c").param("state", stateOf(linkUrl)))
			.andReturn();
		assertThat(linked.getResponse().getRedirectedUrl()).isEqualTo("http://web/account?linked=github");
		mvc.perform(get("/me/oauth").header("Authorization", token)).andExpect(jsonPath("$.length()").value(2));

		mvc.perform(delete("/me/oauth/github").header("Authorization", token)).andExpect(status().isNoContent());
		mvc.perform(post("/me/password").header("Authorization", token)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"newPassword\":\"Chosen@2026\"}")).andExpect(status().isNoContent());
		mvc.perform(delete("/me/oauth/google").header("Authorization", token)).andExpect(status().isNoContent());
	}

	private void profileFor(OAuthProvider provider, String subject, String email, boolean verified) {
		when(providerClient.exchangeCode(eq(provider), anyString(), anyString()))
			.thenReturn(new OAuthProfileData(provider, subject, email, verified, "Test User", null));
	}

	private MvcResult loginThroughProvider(String provider, String redirect) throws Exception {
		var authorize = get("/auth/oauth/" + provider + "/authorize");
		if (redirect != null) {
			authorize.param("redirect", redirect);
		}
		String location = mvc.perform(authorize)
			.andExpect(status().isFound())
			.andReturn()
			.getResponse()
			.getRedirectedUrl();
		return mvc
			.perform(get("/auth/oauth/" + provider + "/callback").param("code", "code")
				.param("state", stateOf(location)))
			.andExpect(status().isFound())
			.andReturn();
	}

	private static String stateOf(String url) {
		return UriComponentsBuilder.fromUriString(url).build().getQueryParams().getFirst("state");
	}

	private String accessToken(Cookie refresh) throws Exception {
		String body = mvc.perform(post("/auth/c/refresh").cookie(refresh))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String register() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Test User\"}"))
			.andExpect(status().isCreated());
		return email;
	}

}
