package tn.autocare.apiaccess;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;

/** Partner API keys (template: platform/api-access) and the /external/v1 API. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ApiKeyFlowTests {

	@Autowired
	MockMvc mvc;

	private String admin;

	@BeforeEach
	void loginAsAdmin() throws Exception {
		String body = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		admin = "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	@Test
	void keyUnlocksOnlyItsPermissionsAndIsRateLimited() throws Exception {
		String key = createKey(
				"{\"label\":\"Assurance Star\",\"permissions\":[\"status:read\",\"catalog:read\"],\"rateLimitPerMinute\":3}");

		mvc.perform(get("/external/v1/status").header("X-Api-Key", key))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.keyLabel").value("Assurance Star"));
		mvc.perform(get("/external/v1/catalog/services").header("Authorization", "ApiKey " + key))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$[0].name").exists());
		mvc.perform(get("/external/v1/providers").header("X-Api-Key", key)).andExpect(status().isForbidden());
		mvc.perform(get("/external/v1/status").header("X-Api-Key", key))
			.andExpect(status().isTooManyRequests())
			.andExpect(jsonPath("$.code").value("API_KEY_RATE_LIMITED"))
			.andExpect(header().exists("Retry-After"));
	}

	@Test
	void refusesMissingWrongAndForeignIpKeys() throws Exception {
		mvc.perform(get("/external/v1/status"))
			.andExpect(status().isUnauthorized())
			.andExpect(jsonPath("$.code").value("API_KEY_MISSING"));
		mvc.perform(
				get("/external/v1/status").header("X-Api-Key", "ac_live_000000000000000000000000_" + "0".repeat(64)))
			.andExpect(jsonPath("$.code").value("API_KEY_INVALID"));
		// A user's JWT is not an API key.
		mvc.perform(get("/external/v1/status").header("Authorization", admin)).andExpect(status().isUnauthorized());

		String officeOnly = createKey(
				"{\"label\":\"Office\",\"permissions\":[\"status:read\"],\"allowedIps\":[\"10.0.0.0/8\"]}");
		mvc.perform(get("/external/v1/status").header("X-Api-Key", officeOnly))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("API_KEY_IP_NOT_ALLOWED"));
		mvc.perform(get("/external/v1/status").header("X-Api-Key", officeOnly).with(request -> {
			request.setRemoteAddr("10.20.30.40");
			return request;
		})).andExpect(status().isOk());
	}

	@Test
	void rotatesWithAGracePeriodRevokesAndMetersUsage() throws Exception {
		String created = mvc
			.perform(post("/admin/api-keys").header("Authorization", admin)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"label\":\"Flotte\",\"permissions\":[\"status:read\",\"providers:read\"]}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer id = JsonPath.read(created, "$.apiKey.id");
		String oldKey = JsonPath.read(created, "$.key");

		String rotated = mvc.perform(post("/admin/api-keys/" + id + "/rotate").header("Authorization", admin))
			.andExpect(jsonPath("$.apiKey.previousSecretExpiresAt").exists())
			.andReturn()
			.getResponse()
			.getContentAsString();
		String newKey = JsonPath.read(rotated, "$.key");
		mvc.perform(get("/external/v1/status").header("X-Api-Key", oldKey)).andExpect(status().isOk());
		mvc.perform(get("/external/v1/providers").header("X-Api-Key", newKey)).andExpect(status().isOk());

		mvc.perform(get("/admin/api-keys/" + id + "/usage").header("Authorization", admin))
			.andExpect(jsonPath("$[0].requests").value(2));

		mvc.perform(post("/admin/api-keys/" + id + "/revoke").header("Authorization", admin)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"reason\":\"Contrat terminé\"}")).andExpect(jsonPath("$.status").value("REVOKED"));
		mvc.perform(get("/external/v1/status").header("X-Api-Key", newKey))
			.andExpect(jsonPath("$.code").value("API_KEY_INACTIVE"));
		mvc.perform(post("/admin/api-keys/" + id + "/rotate").header("Authorization", admin))
			.andExpect(status().isConflict());
	}

	@Test
	void validatesPermissionsAndIps() throws Exception {
		mvc.perform(post("/admin/api-keys").header("Authorization", admin)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"label\":\"X\",\"permissions\":[\"users:delete\"]}"))
			.andExpect(jsonPath("$.code").value("API_KEY_PERMISSION_UNKNOWN"));
		mvc.perform(post("/admin/api-keys").header("Authorization", admin)
			.contentType(MediaType.APPLICATION_JSON)
			.content("{\"label\":\"X\",\"permissions\":[\"status:read\"],\"allowedIps\":[\"not-an-ip\"]}"))
			.andExpect(jsonPath("$.code").value("API_KEY_IP_INVALID"));
	}

	private String createKey(String body) throws Exception {
		String created = mvc
			.perform(post("/admin/api-keys").header("Authorization", admin)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return JsonPath.read(created, "$.key");
	}

}
