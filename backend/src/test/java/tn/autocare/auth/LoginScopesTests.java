package tn.autocare.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.jayway.jsonpath.JsonPath;

import jakarta.servlet.http.Cookie;
import tn.autocare.TestcontainersConfiguration;

/**
 * The template's two login scopes: transport (cookie /auth/c vs header /auth/h) and
 * session scope.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class LoginScopesTests {

	private static final String ADMIN = "{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\"";

	@Autowired
	MockMvc mvc;

	@Test
	void backofficeEndpointsNeedABackofficeSession() throws Exception {
		MvcResult customer = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON).content(ADMIN + "}"))
			.andExpect(status().isOk())
			.andReturn();
		mvc.perform(get("/admin/users").header("Authorization", bearer(customer))).andExpect(status().isForbidden());

		MvcResult backoffice = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content(ADMIN + ",\"scope\":\"backoffice\"}"))
			.andExpect(status().isOk())
			.andReturn();
		mvc.perform(get("/admin/users").header("Authorization", bearer(backoffice))).andExpect(status().isOk());

		// Each scope has its own cookie, refreshed with ?scope=.
		Cookie boCookie = backoffice.getResponse().getCookie("autocare_bo_refresh");
		assertThat(boCookie).isNotNull();
		assertThat(backoffice.getResponse().getCookie("autocare_refresh")).isNull();
		mvc.perform(post("/auth/c/refresh").param("scope", "backoffice").cookie(boCookie)).andExpect(status().isOk());
		// The customer scope has no cookie here: no customer session, not an error.
		mvc.perform(post("/auth/c/refresh").cookie(boCookie)).andExpect(status().isNoContent());
	}

	@Test
	void customersCannotOpenBackofficeSessions() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Client\"}"))
			.andExpect(status().isCreated());
		mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"scope\":\"backoffice\"}"))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("NOT_BACKOFFICE_USER"));
	}

	@Test
	void headerModeReturnsBothTokensForMobileApps() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String registered = mvc
			.perform(post("/auth/h/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Mobile\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.refreshToken").isString())
			.andExpect(jsonPath("$.scope").value("customer"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		String refreshToken = JsonPath.read(registered, "$.refreshToken");

		String refreshed = mvc
			.perform(post("/auth/h/refresh").contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\":\"" + refreshToken + "\"}"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		String newRefreshToken = JsonPath.read(refreshed, "$.refreshToken");
		assertThat(newRefreshToken).isNotEqualTo(refreshToken);

		mvc.perform(post("/auth/h/logout").contentType(MediaType.APPLICATION_JSON)
			.content("{\"refreshToken\":\"" + newRefreshToken + "\"}")).andExpect(status().isNoContent());
		mvc.perform(post("/auth/h/refresh").contentType(MediaType.APPLICATION_JSON)
			.content("{\"refreshToken\":\"" + newRefreshToken + "\"}")).andExpect(status().isUnauthorized());
	}

	private static String bearer(MvcResult result) throws Exception {
		return "Bearer " + JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
	}

}
