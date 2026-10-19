package tn.autocare.provider;

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

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class ProviderFlowTests {

	@Autowired
	MockMvc mvc;

	@Test
	void providerOffersServicesAndAppearsInSearchOnceApproved() throws Exception {
		String owner = registerUser();
		String unique = "Zzgarage" + UUID.randomUUID().toString().substring(0, 6);
		Integer orgId = createOrganization(owner, unique, "Sousse");
		String services = "/organizations/" + orgId + "/services";
		Integer vidangeId = catalogServiceId("Vidange");

		String offered = call(owner,
				post(services)
					.content("{\"serviceId\":" + vidangeId + ",\"atHome\":true,\"indicativePrice\":\"85.500\"}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.serviceName").value("Vidange"))
			.andExpect(jsonPath("$.indicativePrice").value("85.500"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer providerServiceId = JsonPath.read(offered, "$.id");
		call(owner, post(services).content("{\"serviceId\":" + vidangeId + ",\"atHome\":false}"))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("PROVIDER_SERVICE_ALREADY_OFFERED"));

		// Not approved yet: not public.
		mvc.perform(get("/providers").param("q", unique)).andExpect(jsonPath("$.page.totalElements").value(0));

		String admin = login("admin@autocare.tn", "Admin@123456");
		call(admin, post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isOk());

		// The profile copy is written by an async event listener after the approval
		// commits.
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> mvc.perform(get("/providers").param("q", unique))
				.andExpect(jsonPath("$.page.totalElements").value(1))
				.andExpect(jsonPath("$.content[0].services[0].atHome").value(true)));

		// Accent-free, prefix, and service-name search; filters combine.
		mvc.perform(get("/providers").param("q", unique.substring(0, 5).toUpperCase() + " vidan"))
			.andExpect(jsonPath("$.content[*].organizationId", org.hamcrest.Matchers.hasItem(orgId)));
		mvc.perform(get("/providers").param("q", unique).param("governorate", "Sfax"))
			.andExpect(jsonPath("$.page.totalElements").value(0));
		mvc.perform(get("/providers").param("q", unique)
			.param("serviceId", String.valueOf(vidangeId))
			.param("atHome", "true")).andExpect(jsonPath("$.page.totalElements").value(1));
		mvc.perform(get("/providers/" + orgId)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value(unique));

		call(owner, put(services + "/" + providerServiceId).content("{\"atHome\":false,\"indicativePrice\":null}"))
			.andExpect(jsonPath("$.indicativePrice").doesNotExist());
		mvc.perform(get("/providers").param("q", unique).param("atHome", "true"))
			.andExpect(jsonPath("$.page.totalElements").value(0));

		call(owner, delete(services + "/" + providerServiceId)).andExpect(status().isNoContent());
		mvc.perform(get("/providers").param("q", unique)).andExpect(jsonPath("$.page.totalElements").value(0));
	}

	@Test
	void onlyManagersChangeTheOffer() throws Exception {
		String owner = registerUser();
		String stranger = registerUser();
		Integer orgId = createOrganization(owner, "Garage Test", "Tunis");
		call(stranger,
				post("/organizations/" + orgId + "/services")
					.content("{\"serviceId\":" + catalogServiceId("Freinage") + ",\"atHome\":false}"))
			.andExpect(status().isForbidden());
		call(owner, post("/organizations/" + orgId + "/services").content(
				"{\"serviceId\":" + catalogServiceId("Freinage") + ",\"atHome\":false,\"indicativePrice\":\"-1\"}"))
			.andExpect(status().isBadRequest());
	}

	private Integer createOrganization(String token, String name, String governorate) throws Exception {
		String body = call(token,
				post("/organizations").content("{\"name\":\"" + name
						+ "\",\"type\":\"PROVIDER\",\"phone\":\"+216 73 000 000\",\"governorate\":\"" + governorate
						+ "\",\"city\":\"Centre\"}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return JsonPath.read(body, "$.organization.id");
	}

	private Integer catalogServiceId(String name) throws Exception {
		String body = mvc.perform(get("/catalog/services")).andReturn().getResponse().getContentAsString();
		List<Integer> ids = JsonPath.read(body, "$[?(@.name == '" + name + "')].id");
		return ids.getFirst();
	}

	private ResultActions call(String token, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", token).contentType(MediaType.APPLICATION_JSON));
	}

	private String registerUser() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Test User\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String login(String email, String password) throws Exception {
		String body = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"scope\":\"backoffice\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
