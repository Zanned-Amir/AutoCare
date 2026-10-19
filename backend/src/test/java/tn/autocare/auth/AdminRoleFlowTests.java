package tn.autocare.auth;

import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;

/**
 * Backoffice roles: create, assign, delete with reassignment; staff open organizations.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminRoleFlowTests {

	private static final String PASSWORD = "Secret@1234";

	@Autowired
	MockMvc mvc;

	@Test
	void adminManagesRolesAndStaffCreateOrganizations() throws Exception {
		String admin = admin();
		String key = "CATALOG_" + UUID.randomUUID().toString().substring(0, 6).toUpperCase().replace('-', '_');
		String role = "{\"name\":\"" + key
				+ "\",\"label\":\"Éditeur catalogue\",\"description\":\"Catalogue\",\"permissions\":[\"service:*\",\"service:*\"],\"backoffice\":true}";

		call(admin, post("/admin/roles").content(role.replace("service:*\",\"service:*", "bad perm")))
			.andExpect(status().isBadRequest());
		Integer roleId = JsonPath
			.read(body(call(admin, post("/admin/roles").content(role)).andExpect(status().isCreated())
				.andExpect(jsonPath("$.permissions.length()").value(1))
				.andExpect(jsonPath("$.system").value(false))), "$.id");
		call(admin, post("/admin/roles").content(role)).andExpect(jsonPath("$.code").value("ROLE_NAME_TAKEN"));

		String email = UUID.randomUUID() + "@example.com";
		String user = register(email, "Staff Catalogue");
		Integer userId = JsonPath.read(body(call(user, get("/me"))), "$.id");
		call(admin, put("/admin/users/" + userId + "/roles").content("{\"roles\":[\"USER\",\"" + key + "\"]}"))
			.andExpect(status().isOk());
		call(admin, get("/admin/roles/" + roleId)).andExpect(jsonPath("$.memberCount").value(1));

		String staff = login(email, "backoffice");
		String org = "{\"name\":\"Garage Staff\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"Bardo\"}";
		call(staff,
				post("/admin/organizations")
					.content("{\"ownerEmail\":\"" + email + "\",\"approve\":true,\"organization\":" + org + "}"))
			.andExpect(status().isForbidden());
		call(staff,
				post("/admin/organizations")
					.content("{\"ownerEmail\":\"" + email + "\",\"approve\":false,\"organization\":" + org + "}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("PENDING"));
		call(staff, get("/admin/organizations")).andExpect(status().isForbidden());
		call(staff, get("/admin/roles")).andExpect(status().isForbidden());

		Integer adminRoleId = roleId("ADMIN", admin);
		call(admin,
				put("/admin/roles/" + adminRoleId).content(
						"{\"name\":\"ADMIN\",\"label\":\"Admin\",\"permissions\":[\"user:read\"],\"backoffice\":true}"))
			.andExpect(jsonPath("$.code").value("ROLE_SYSTEM_LOCKED"));
		call(admin, delete("/admin/roles/" + adminRoleId)).andExpect(jsonPath("$.code").value("ROLE_SYSTEM_LOCKED"));
		call(admin, put("/admin/roles/" + roleId).content(role.replace("service:*\",\"service:*", "service:read")))
			.andExpect(jsonPath("$.permissions[0]").value("service:read"));

		call(admin, delete("/admin/roles/" + roleId)).andExpect(jsonPath("$.code").value("ROLE_IN_USE"));
		call(admin, delete("/admin/roles/" + roleId + "?replacementRoleId=" + roleId("SUPPORT", admin)))
			.andExpect(status().isNoContent());
		call(admin, get("/admin/users/" + userId)).andExpect(jsonPath("$.roles[?(@ == 'SUPPORT')]").isNotEmpty());
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> call(admin, get("/admin/audit-logs?targetType=ROLE&targetId=" + roleId))
				.andExpect(jsonPath("$.content.length()").value(3)));
	}

	private Integer roleId(String name, String admin) throws Exception {
		List<Integer> ids = JsonPath.read(body(call(admin, get("/admin/roles"))), "$[?(@.name == '" + name + "')].id");
		return ids.getFirst();
	}

	private ResultActions call(String token, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", token).contentType(MediaType.APPLICATION_JSON));
	}

	private static String body(ResultActions result) throws Exception {
		return result.andReturn().getResponse().getContentAsString();
	}

	private String register(String email, String name) throws Exception {
		String body = body(mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"fullName\":\"" + name + "\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String login(String email, String scope) throws Exception {
		String body = body(mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"scope\":\"" + scope + "\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String admin() throws Exception {
		String body = body(mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
