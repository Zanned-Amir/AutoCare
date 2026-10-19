package tn.autocare.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;
import tn.autocare.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AuthFlowTests {

	private static final String REFRESH_COOKIE = "autocare_refresh";

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Test
	void refreshWithoutCookieIsAnEmptyAnswerNotAnError() throws Exception {
		mvc.perform(post("/auth/c/refresh")).andExpect(status().isNoContent());
		mvc.perform(post("/auth/c/refresh").param("scope", "backoffice")).andExpect(status().isNoContent());
	}

	@Test
	void registersReadsProfileAndRotatesRefreshToken() throws Exception {
		MvcResult registered = mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON).content("""
				{"email":"sami@example.com","password":"Secret@1234","fullName":"Sami Ben Ali"}"""))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.user.roles[0]").value("USER"))
			.andReturn();
		String accessToken = JsonPath.read(registered.getResponse().getContentAsString(), "$.accessToken");
		Cookie firstRefresh = registered.getResponse().getCookie(REFRESH_COOKIE);
		assertThat(firstRefresh).isNotNull();
		assertThat(firstRefresh.isHttpOnly()).isTrue();

		mvc.perform(get("/me").header("Authorization", "Bearer " + accessToken))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.email").value("sami@example.com"));

		MvcResult refreshed = mvc.perform(post("/auth/c/refresh").cookie(firstRefresh))
			.andExpect(status().isOk())
			.andReturn();
		Cookie secondRefresh = refreshed.getResponse().getCookie(REFRESH_COOKIE);
		assertThat(secondRefresh.getValue()).isNotEqualTo(firstRefresh.getValue());

		// Reusing a rotated token after the 10 s grace revokes every session, including
		// the newest one.
		jdbc.update("""
				UPDATE auth.refresh_tokens SET revoked_at = revoked_at - interval '1 minute'
				WHERE revoke_reason = 'ROTATED'
				  AND user_id = (SELECT id FROM auth.users WHERE email = 'sami@example.com')""");
		mvc.perform(post("/auth/c/refresh").cookie(firstRefresh))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_REFRESH_TOKEN"));
		mvc.perform(post("/auth/c/refresh").cookie(secondRefresh)).andExpect(status().isUnauthorized());
	}

	@Test
	void refusesWrongPasswordAndDuplicateEmail() throws Exception {
		String body = """
				{"email":"amel@example.com","password":"Secret@1234","fullName":"Amel"}""";
		mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isCreated());
		mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON).content(body))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
		mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON).content("""
				{"email":"amel@example.com","password":"wrong-password"}"""))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
	}

	@Test
	void devAdminCanUseAdminEndpoints() throws Exception {
		MvcResult login = mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON).content("""
				{"email":"admin@autocare.tn","password":"Admin@123456","scope":"backoffice"}"""))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.user.permissions[0]").value("*:*"))
			.andReturn();
		String accessToken = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");

		mvc.perform(get("/admin/catalog/services").header("Authorization", "Bearer " + accessToken))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.page.totalElements").value(8));
	}

}
