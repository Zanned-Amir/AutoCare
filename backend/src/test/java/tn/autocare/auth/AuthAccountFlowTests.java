package tn.autocare.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.util.UriComponentsBuilder;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;
import tn.autocare.TestcontainersConfiguration;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;

/**
 * Account flows ported from the NestJS template. E-mails are captured instead of sent.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthAccountFlowTests {

	private static final String PASSWORD = "Secret@1234";

	private static final String CHROME = "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0";

	@Autowired
	MockMvc mvc;

	@MockitoBean
	MailService mailService;

	@Test
	void verifiesEmailWithTheLinkSentAtSignUp() throws Exception {
		Session user = register();
		String token = tokenFrom(lastMail("verify-email", user.email()));

		mvc.perform(post("/auth/email-verification/confirm").contentType(MediaType.APPLICATION_JSON)
			.content(json("token", token))).andExpect(status().isNoContent());
		call(user, get("/me")).andExpect(jsonPath("$.emailVerified").value(true));

		mvc.perform(post("/auth/email-verification/confirm").contentType(MediaType.APPLICATION_JSON)
			.content(json("token", token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("INVALID_ACCOUNT_TOKEN"));
		call(user, post("/me/email-verification/send")).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("EMAIL_ALREADY_VERIFIED"));
	}

	@Test
	void verifiesEmailWithAnOtpThatDiesAfterFiveWrongTries() throws Exception {
		Session user = register();
		call(user, post("/me/email-verification/send").content("{\"channel\":\"OTP\"}"))
			.andExpect(status().isAccepted());
		String code = (String) lastMail("verify-email", user.email()).variables().get("code");

		call(user, post("/me/email-verification/send").content("{\"channel\":\"OTP\"}"))
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("SEND_COOLDOWN"))
			.andExpect(jsonPath("$.retryAfter").isNumber());

		String wrong = code.equals("000000") ? "111111" : "000000";
		for (int i = 0; i < 5; i++) {
			call(user, post("/me/email-verification/confirm-otp").content(json("code", wrong)))
				.andExpect(jsonPath("$.code").value("INVALID_OTP"));
		}
		call(user, post("/me/email-verification/confirm-otp").content(json("code", code)))
			.andExpect(status().isBadRequest());
		call(user, get("/me")).andExpect(jsonPath("$.emailVerified").value(false));
	}

	@Test
	void resetsPasswordByLinkAndSignsOutEverywhere() throws Exception {
		Session user = register();
		mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
			.content(json("email", user.email()))).andExpect(status().isAccepted());
		String token = tokenFrom(lastMail("reset-password", user.email()));

		mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
			.content("{\"token\":\"" + token + "\",\"newPassword\":\"NewSecret@5678\"}"))
			.andExpect(status().isNoContent());

		mvc.perform(post("/auth/c/refresh").cookie(user.refresh())).andExpect(status().isUnauthorized());
		login(user.email(), PASSWORD).andExpect(status().isUnauthorized());
		login(user.email(), "NewSecret@5678").andExpect(status().isOk());
	}

	@Test
	void resetsPasswordWithAnOtpAndHidesUnknownEmails() throws Exception {
		Session user = register();
		mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"channel\":\"OTP\"}")).andExpect(status().isAccepted());
		String code = (String) lastMail("reset-password", user.email()).variables().get("code");

		mvc.perform(post("/auth/password-reset/confirm-otp").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"code\":\"" + code + "\",\"newPassword\":\"Otp@Secret99\"}"))
			.andExpect(status().isNoContent());
		login(user.email(), "Otp@Secret99").andExpect(status().isOk());

		// Same answer for an unknown address, and no e-mail.
		mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
			.content(json("email", "nobody-" + UUID.randomUUID() + "@example.com"))).andExpect(status().isAccepted());
	}

	@Test
	void changesPasswordKeepingOnlyTheCurrentSession() throws Exception {
		Session user = register();
		Session otherDevice = loginSession(user.email(), PASSWORD, "Mozilla/5.0 (iPhone) Safari/604.1");

		call(user, post("/me/password").content("{\"currentPassword\":\"wrong\",\"newPassword\":\"Changed@1234\"}"))
			.andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));
		call(user,
				post("/me/password")
					.content("{\"currentPassword\":\"" + PASSWORD + "\",\"newPassword\":\"Changed@1234\"}"))
			.andExpect(status().isNoContent());

		mvc.perform(post("/auth/c/refresh").cookie(otherDevice.refresh())).andExpect(status().isUnauthorized());
		mvc.perform(post("/auth/c/refresh").cookie(user.refresh())).andExpect(status().isOk());
		assertThat(lastMail("password-changed", user.email())).isNotNull();
	}

	@Test
	void changesEmailAfterConfirmingTheNewAddress() throws Exception {
		Session user = register();
		String newEmail = UUID.randomUUID() + "@new.example.com";
		call(user,
				post("/me/email-change")
					.content("{\"newEmail\":\"" + newEmail + "\",\"currentPassword\":\"" + PASSWORD + "\"}"))
			.andExpect(status().isAccepted());
		String token = tokenFrom(lastMail("change-email", newEmail));

		mvc.perform(post("/auth/email-change/confirm").contentType(MediaType.APPLICATION_JSON)
			.content(json("token", token))).andExpect(status().isNoContent());
		login(newEmail, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.user.emailVerified").value(true));
		login(user.email(), PASSWORD).andExpect(status().isUnauthorized());
	}

	@Test
	void listsAndRevokesSessionsAndAlertsOnNewDevices() throws Exception {
		Session user = register();
		Session laptop = loginSession(user.email(), PASSWORD, CHROME);
		assertThat(lastMail("new-device-login", user.email()).variables().get("device")).isEqualTo("Chrome · Windows");

		String sessions = call(laptop, get("/me/sessions")).andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		List<Boolean> current = JsonPath.read(sessions, "$[*].current");
		assertThat(current).hasSize(2).containsOnlyOnce(true);

		call(laptop, delete("/me/sessions")).andExpect(status().isNoContent());
		call(laptop, get("/me/sessions")).andExpect(jsonPath("$.length()").value(1));
		mvc.perform(post("/auth/c/refresh").cookie(user.refresh())).andExpect(status().isUnauthorized());
		mvc.perform(post("/auth/c/refresh").cookie(laptop.refresh())).andExpect(status().isOk());
	}

	@Test
	void concurrentRefreshFromTwoTabsIsNotTreatedAsTheft() throws Exception {
		Session user = register();
		mvc.perform(post("/auth/c/refresh").cookie(user.refresh())).andExpect(status().isOk());
		// The second tab still holds the same cookie a moment later.
		mvc.perform(post("/auth/c/refresh").cookie(user.refresh())).andExpect(status().isOk());
	}

	@Test
	void locksLoginAfterFiveWrongPasswords() throws Exception {
		Session user = register();
		for (int i = 0; i < 5; i++) {
			login(user.email(), "wrong-password").andExpect(status().isUnauthorized());
		}
		login(user.email(), PASSWORD).andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("TOO_MANY_LOGIN_ATTEMPTS"));
	}

	@Test
	void welcomeFlowIsOfferedOnceAfterSignUp() throws Exception {
		Session user = register();
		call(user, get("/me")).andExpect(jsonPath("$.onboardingDone").value(false));
		call(user, post("/me/onboarding").content("{\"skipped\":false}")).andExpect(status().isOk())
			.andExpect(jsonPath("$.onboardingDone").value(true));
		// A second answer (another tab) is accepted and changes nothing.
		call(user, post("/me/onboarding").content("{\"skipped\":true}")).andExpect(status().isOk());
		call(user, get("/me")).andExpect(jsonPath("$.onboardingDone").value(true));
	}

	@Test
	void updatesProfileAndDeactivatesAccount() throws Exception {
		Session user = register();
		call(user, patch("/me").content("{\"fullName\":\"Nouveau Nom\",\"phone\":\"+216 20 000 000\"}"))
			.andExpect(jsonPath("$.fullName").value("Nouveau Nom"));

		call(user, post("/me/deactivate").content(json("currentPassword", "wrong")))
			.andExpect(jsonPath("$.code").value("INVALID_CURRENT_PASSWORD"));
		call(user, post("/me/deactivate").content(json("currentPassword", PASSWORD))).andExpect(status().isNoContent());
		login(user.email(), PASSWORD).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
	}

	@Test
	void adminSuspendsUsersAndManagesRoles() throws Exception {
		Session user = register();
		Session admin = loginSession("admin@autocare.tn", "Admin@123456", null, "backoffice");
		String userId = String.valueOf(user.id());

		call(user, get("/admin/users")).andExpect(status().isForbidden());
		call(admin, get("/admin/users").param("q", user.email())).andExpect(jsonPath("$.page.totalElements").value(1));

		call(admin, post("/admin/users/" + userId + "/suspend")).andExpect(jsonPath("$.active").value(false));
		login(user.email(), PASSWORD).andExpect(jsonPath("$.code").value("ACCOUNT_DISABLED"));
		call(admin, post("/admin/users/" + userId + "/unsuspend")).andExpect(jsonPath("$.active").value(true));

		call(admin, put("/admin/users/" + userId + "/roles").content("{\"roles\":[\"USER\",\"ADMIN\"]}"))
			.andExpect(jsonPath("$.roles.length()").value(2));
		call(admin, put("/admin/users/" + admin.id() + "/roles").content("{\"roles\":[\"USER\"]}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("ADMIN_SELF_LOCKOUT"));
	}

	@Test
	void speaksTheUsersLanguage() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		MvcResult result = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.ACCEPT_LANGUAGE, "en-GB,en;q=0.9")
				.content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"fullName\":\"Test User\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.user.locale").value("en"))
			.andReturn();
		Session user = toSession(email, result);
		assertThat(lastMail("verify-email", email).locale().getLanguage()).isEqualTo("en");

		// API errors follow the request language, French by default.
		login(email, "wrong-password").andExpect(jsonPath("$.detail").value("E-mail ou mot de passe incorrect."));
		mvc.perform(post("/auth/c/login").header(HttpHeaders.ACCEPT_LANGUAGE, "en")
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
			.andExpect(jsonPath("$.detail").value("E-mail or password is incorrect."));

		call(user, patch("/me").content("{\"fullName\":\"Test User\",\"locale\":\"fr\"}"))
			.andExpect(jsonPath("$.locale").value("fr"));
		call(user, post("/me/email-verification/send")).andExpect(status().isAccepted());
		assertThat(lastMail("verify-email", email).locale().getLanguage()).isEqualTo("fr");
	}

	@Test
	void sendsWelcomeAfterVerificationAndNotifiesBothAddressesOnEmailChange() throws Exception {
		Session user = register();
		mvc.perform(post("/auth/email-verification/confirm").contentType(MediaType.APPLICATION_JSON)
			.content(json("token", tokenFrom(lastMail("verify-email", user.email())))));
		assertThat(lastMail("welcome", user.email())).isNotNull();

		String newEmail = UUID.randomUUID() + "@new.example.com";
		call(user, post("/me/email-change")
			.content("{\"newEmail\":\"" + newEmail + "\",\"currentPassword\":\"" + PASSWORD + "\"}"));
		mvc.perform(post("/auth/email-change/confirm").contentType(MediaType.APPLICATION_JSON)
			.content(json("token", tokenFrom(lastMail("change-email", newEmail))))).andExpect(status().isNoContent());
		assertThat(lastMail("email-changed", user.email()).variables()).containsEntry("newEmail", newEmail);
		assertThat(lastMail("email-changed", newEmail)).isNotNull();
	}

	private record Session(Long id, String email, String token, Cookie refresh) {
	}

	private Session register() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		MvcResult result = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"fullName\":\"Test User\"}"))
			.andExpect(status().isCreated())
			.andReturn();
		return toSession(email, result);
	}

	private Session loginSession(String email, String password, String userAgent) throws Exception {
		return loginSession(email, password, userAgent, "customer");
	}

	private Session loginSession(String email, String password, String userAgent, String scope) throws Exception {
		MockHttpServletRequestBuilder request = post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"scope\":\"" + scope + "\"}");
		if (userAgent != null) {
			request.header(HttpHeaders.USER_AGENT, userAgent);
		}
		return toSession(email, mvc.perform(request).andExpect(status().isOk()).andReturn());
	}

	@Test
	void adminOpensAnAccountAndThePersonChoosesAPasswordFromTheInvitation() throws Exception {
		String admin = "Bearer " + JsonPath.read(mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString(), "$.accessToken");
		String email = UUID.randomUUID() + "@example.com";
		String body = "{\"email\":\"" + email + "\",\"fullName\":\"Garage Phone\",\"roles\":[\"USER\"]}";

		call(register(), post("/admin/users").content(body)).andExpect(status().isForbidden());
		String created = mvc
			.perform(post("/admin/users").header("Authorization", admin)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.passwordSet").value(false))
			.andExpect(jsonPath("$.roles[0]").value("USER"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer userId = JsonPath.read(created, "$.id");
		mvc.perform(post("/admin/users").header("Authorization", admin)
			.contentType(MediaType.APPLICATION_JSON)
			.content(body)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));

		String token = tokenFrom(lastMail("account-invitation", email));
		mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
			.content("{\"token\":\"" + token + "\",\"newPassword\":\"" + PASSWORD + "\"}"))
			.andExpect(status().isNoContent());
		login(email, PASSWORD).andExpect(status().isOk());

		mvc.perform(get("/admin/users/" + userId).header("Authorization", admin))
			.andExpect(jsonPath("$.passwordSet").value(true))
			.andExpect(jsonPath("$.emailVerified").value(true));
		mvc.perform(post("/admin/users/" + userId + "/invitation").header("Authorization", admin))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("USER_PASSWORD_ALREADY_SET"));
	}

	private ResultActions login(String email, String password) throws Exception {
		return mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
	}

	private Session toSession(String email, MvcResult result) throws Exception {
		String body = result.getResponse().getContentAsString();
		Integer id = JsonPath.read(body, "$.user.id");
		return new Session(id.longValue(), email, "Bearer " + JsonPath.read(body, "$.accessToken"),
				result.getResponse().getCookie("autocare_refresh") != null
						? result.getResponse().getCookie("autocare_refresh")
						: result.getResponse().getCookie("autocare_bo_refresh"));
	}

	private ResultActions call(Session session, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", session.token()).contentType(MediaType.APPLICATION_JSON));
	}

	private MailMessage lastMail(String template, String to) {
		ArgumentCaptor<MailMessage> captor = ArgumentCaptor.forClass(MailMessage.class);
		verify(mailService, atLeastOnce()).send(captor.capture());
		return captor.getAllValues()
			.reversed()
			.stream()
			.filter(mail -> mail.template().equals(template) && mail.to().equals(to))
			.findFirst()
			.orElseThrow(() -> new AssertionError("No '" + template + "' mail to " + to));
	}

	private static String tokenFrom(MailMessage mail) {
		String link = (String) mail.variables().get("link");
		return UriComponentsBuilder.fromUriString(link).build().getQueryParams().getFirst("token");
	}

	private static String json(String field, String value) {
		return "{\"" + field + "\":\"" + value + "\"}";
	}

}
