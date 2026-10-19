package tn.autocare.organization;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.ResultActions;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OrganizationFlowTests {

	private static final String GARAGE = """
			{"name":"Garage Ennour","type":"PROVIDER","phone":"+216 71 000 000","governorate":"Tunis","city":"La Marsa"}""";

	@Autowired
	MockMvc mvc;

	@Test
	void ownerCreatesOrganizationAndManagesMembers() throws Exception {
		User owner = registerUser();
		User technician = registerUser();
		User stranger = registerUser();

		String created = call(owner, post("/organizations").content(GARAGE)).andExpect(status().isCreated())
			.andExpect(jsonPath("$.organization.status").value("PENDING"))
			.andExpect(jsonPath("$.roleKey").value("PROVIDER_OWNER"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(created, "$.organization.id");
		String org = "/organizations/" + orgId;

		call(owner, get("/organizations/mine")).andExpect(jsonPath("$[0].permissions[0]").value("*:*"));
		call(stranger, get(org)).andExpect(status().isForbidden());

		String added = call(owner,
				post(org + "/members")
					.content("{\"email\":\"" + technician.email + "\",\"roleKey\":\"PROVIDER_TECHNICIAN\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.fullName").value("Test User"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer technicianMemberId = JsonPath.read(added, "$.id");

		// A technician cannot read the organization profile...
		call(technician, get(org)).andExpect(status().isForbidden());
		// ...until given organization:read. The permission cache must be refreshed right
		// away.
		call(owner,
				put(org + "/members/" + technicianMemberId + "/permissions")
					.content("{\"permissions\":[\"organization:read\",\"request:read\"]}"))
			.andExpect(jsonPath("$.roleKey").value("CUSTOM"));
		call(technician, get(org)).andExpect(status().isOk());
		// Taking it back must be immediate too, not wait for the cached permissions.
		call(owner, put(org + "/members/" + technicianMemberId + "/permissions")
			.content("{\"permissions\":[\"request:read\"]}")).andExpect(status().isOk());
		call(technician, get(org)).andExpect(status().isForbidden());
		call(owner, put(org + "/members/" + technicianMemberId + "/permissions")
			.content("{\"permissions\":[\"organization:read\",\"request:read\"]}")).andExpect(status().isOk());
		call(technician, get(org)).andExpect(status().isOk());

		call(owner, put(org + "/members/" + technicianMemberId + "/role").content("{\"roleKey\":\"SELLER_STAFF\"}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("MEMBER_ROLE_TYPE_MISMATCH"));

		call(technician, get(org + "/members")).andExpect(status().isForbidden());
		call(owner, delete(org + "/members/" + technicianMemberId)).andExpect(status().isNoContent());
		call(technician, get(org)).andExpect(status().isForbidden());
	}

	@Test
	void organizationKeepsAtLeastOneManager() throws Exception {
		User owner = registerUser();
		String created = call(owner, post("/organizations").content(GARAGE)).andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(created, "$.organization.id");
		String members = call(owner, get("/organizations/" + orgId + "/members")).andReturn()
			.getResponse()
			.getContentAsString();
		Integer ownerMemberId = JsonPath.read(members, "$[0].id");

		call(owner,
				put("/organizations/" + orgId + "/members/" + ownerMemberId + "/role")
					.content("{\"roleKey\":\"PROVIDER_TECHNICIAN\"}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("LAST_MEMBER_MANAGER"));
		call(owner, delete("/organizations/" + orgId + "/members/" + ownerMemberId)).andExpect(status().isConflict());
		// The refused change was rolled back: the owner still manages the organization.
		call(owner, get("/organizations/" + orgId + "/members"))
			.andExpect(jsonPath("$[0].roleKey").value("PROVIDER_OWNER"));
	}

	@Test
	void adminApprovesOrganization() throws Exception {
		User owner = registerUser();
		String created = call(owner, post("/organizations").content(GARAGE)).andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(created, "$.organization.id");

		call(owner, post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isForbidden());

		User admin = login("admin@autocare.tn", "Admin@123456");
		call(admin, get("/admin/organizations?status=PENDING")).andExpect(status().isOk());
		call(admin, post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isOk())
			.andExpect(jsonPath("$.status").value("APPROVED"));
		call(admin, post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isConflict());
	}

	@Test
	void adminCreatesOrganizationForAnExistingAccount() throws Exception {
		User owner = registerUser();
		User admin = login("admin@autocare.tn", "Admin@123456");
		String body = "{\"ownerEmail\":\"%s\",\"approve\":%s,\"organization\":" + GARAGE + "}";

		call(owner, post("/admin/organizations").content(body.formatted(owner.email(), true)))
			.andExpect(status().isForbidden());
		call(admin, post("/admin/organizations").content(body.formatted("nobody@example.com", false)))
			.andExpect(status().isNotFound())
			.andExpect(jsonPath("$.code").value("MEMBER_USER_NOT_FOUND"));

		String created = call(admin, post("/admin/organizations").content(body.formatted(owner.email(), true)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("APPROVED"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(created, "$.id");

		call(owner, get("/organizations/mine")).andExpect(jsonPath("$[0].roleKey").value("PROVIDER_OWNER"));
		call(admin, get("/admin/organizations/" + orgId + "/members"))
			.andExpect(jsonPath("$[0].email").value(owner.email()));
		call(admin,
				put("/admin/organizations/" + orgId).content(
						GARAGE.replace("Garage Ennour", "Garage Ennour Plus").replace(",\"type\":\"PROVIDER\"", "")))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.name").value("Garage Ennour Plus"));
	}

	@Test
	void validatesGovernorate() throws Exception {
		User owner = registerUser();
		call(owner, post("/organizations").content(GARAGE.replace("Tunis", "Paris"))).andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ORGANIZATION_GOVERNORATE_INVALID"));
	}

	private record User(String email, String token) {
	}

	private ResultActions call(User user, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", user.token()).contentType(MediaType.APPLICATION_JSON));
	}

	private User registerUser() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Test User\"}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return new User(email, "Bearer " + JsonPath.read(body, "$.accessToken"));
	}

	private User login(String email, String password) throws Exception {
		String body = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"scope\":\"backoffice\"}"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return new User(email, "Bearer " + JsonPath.read(body, "$.accessToken"));
	}

}
