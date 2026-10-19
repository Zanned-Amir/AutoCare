package tn.autocare.review;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.ZoneId;
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
class ReviewFlowTests {

	static final LocalDate TOMORROW = LocalDate.now(ZoneId.of("Africa/Tunis")).plusDays(1);

	@Autowired
	MockMvc mvc;

	@Test
	void clientReviewsACompletedRequestOnceAndTheProviderReplies() throws Exception {
		String owner = register("Garage Avis");
		Integer orgId = createProvider(owner);
		Integer vidange = catalogServiceId("Vidange");
		call(owner, post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + vidange + ",\"atHome\":false}")).andExpect(status().isCreated());
		String client = register("Sami Ben Ali");
		Integer vehicle = JsonPath.read(body(call(client, post("/vehicles").content(
				"{\"brand\":\"Peugeot\",\"model\":\"208\",\"year\":2021,\"fuelType\":\"ESSENCE\",\"mileage\":80000}"))),
				"$.id");
		Integer requestId = JsonPath.read(
				body(call(client,
						post("/service-requests").content("{\"organizationId\":" + orgId + ",\"serviceId\":" + vidange
								+ ",\"vehicleId\":" + vehicle + ",\"desiredDate\":\"" + TOMORROW
								+ "\",\"locationType\":\"AT_PROVIDER\"}"))),
				"$.id");
		String review = "/service-requests/" + requestId + "/review";

		call(client, post(review).content("{\"rating\":5}")).andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("REVIEW_NOT_ALLOWED"));
		String base = "/organizations/" + orgId + "/service-requests/" + requestId;
		call(owner, post(base + "/confirm")).andExpect(status().isOk());
		call(owner, post(base + "/start")).andExpect(status().isOk());
		call(owner, post(base + "/complete").content("{}")).andExpect(status().isOk());

		call(client, get(review)).andExpect(status().isNoContent());
		call(client, post(review).content("{\"rating\":6}")).andExpect(status().isBadRequest());
		Integer reviewId = JsonPath
			.read(body(call(client, post(review).content("{\"rating\":4,\"comment\":\"Rapide et propre.\"}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.authorName").value("Sami A."))), "$.id");
		call(client, post(review).content("{\"rating\":1}")).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("REVIEW_ALREADY_EXISTS"));
		call(register("Curieux"), post(review).content("{\"rating\":1}")).andExpect(status().isForbidden());

		call(client,
				put("/organizations/" + orgId + "/reviews/" + reviewId + "/reply").content("{\"reply\":\"Merci !\"}"))
			.andExpect(status().isForbidden());
		call(owner,
				put("/organizations/" + orgId + "/reviews/" + reviewId + "/reply").content("{\"reply\":\"Merci !\"}"))
			.andExpect(jsonPath("$.reply").value("Merci !"));

		mvc.perform(get("/providers/" + orgId + "/reviews"))
			.andExpect(jsonPath("$.content[0].comment").value("Rapide et propre."))
			.andExpect(jsonPath("$.content[0].reply").value("Merci !"));
		mvc.perform(get("/providers/" + orgId + "/rating"))
			.andExpect(jsonPath("$.average").value(4.0))
			.andExpect(jsonPath("$.count").value(1))
			.andExpect(jsonPath("$.byRating.4").value(1));
		mvc.perform(get("/providers/ratings?organizationIds=" + orgId + ",999999"))
			.andExpect(jsonPath("$['" + orgId + "'].average").value(4.0))
			.andExpect(jsonPath("$['999999']").doesNotExist());
	}

	private Integer createProvider(String owner) throws Exception {
		String org = body(call(owner, post("/organizations").content("{\"name\":\"Garage "
				+ UUID.randomUUID().toString().substring(0, 6)
				+ "\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"La Marsa\"}")));
		Integer orgId = JsonPath.read(org, "$.organization.id");
		call(admin(), post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isOk());
		return orgId;
	}

	private Integer catalogServiceId(String name) throws Exception {
		List<Integer> ids = JsonPath.read(body(mvc.perform(get("/catalog/services"))),
				"$[?(@.name == '" + name + "')].id");
		return ids.getFirst();
	}

	private ResultActions call(String token, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", token).contentType(MediaType.APPLICATION_JSON));
	}

	private static String body(ResultActions result) throws Exception {
		return result.andReturn().getResponse().getContentAsString();
	}

	private String register(String name) throws Exception {
		String body = body(mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + UUID.randomUUID() + "@example.com\",\"password\":\"Secret@1234\",\"fullName\":\""
					+ name + "\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String admin() throws Exception {
		String body = body(mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
