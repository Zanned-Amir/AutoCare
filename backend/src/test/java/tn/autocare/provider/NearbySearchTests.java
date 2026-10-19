package tn.autocare.provider;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

/** Providers placed on the map are found nearest first, with their distance. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class NearbySearchTests {

	// La Marsa (Tunis) and Sfax, about 230 km apart.
	static final String MARSA = ",\"latitude\":36.8782,\"longitude\":10.3247";

	static final String SFAX = ",\"latitude\":34.7406,\"longitude\":10.7603";

	@Autowired
	MockMvc mvc;

	@Test
	void nearestProvidersComeFirstAndRadiusFilters() throws Exception {
		String tag = UUID.randomUUID().toString().substring(0, 8);
		String admin = admin();
		String owner = register();
		Integer marsa = provider(owner, admin, "Proche " + tag, "Tunis", MARSA);
		Integer sfax = provider(owner, admin, "Loin " + tag, "Sfax", SFAX);
		Integer centre = provider(owner, admin, "Centre " + tag, "Sousse", "");

		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> mvc.perform(get("/providers").param("q", tag))
				.andExpect(jsonPath("$.page.totalElements").value(3)));

		// From Tunis city centre: La Marsa is ~13 km away, Sfax ~230 km.
		String near = body(
				mvc.perform(get("/providers").param("q", tag).param("lat", "36.8065").param("lng", "10.1815")));
		List<Integer> order = JsonPath.read(near, "$.content[*].organizationId");
		assertThat(order).containsExactly(marsa, centre, sfax);
		Double distance = JsonPath.read(near, "$.content[0].distanceKm");
		assertThat(distance).isBetween(10.0, 20.0);
		assertThat((Boolean) JsonPath.read(near, "$.content[0].approximateLocation")).isFalse();
		// Not placed on the map: the governorate centre stands in.
		assertThat((Boolean) JsonPath.read(near, "$.content[1].approximateLocation")).isTrue();

		mvc.perform(get("/providers").param("q", tag)
			.param("lat", "36.8065")
			.param("lng", "10.1815")
			.param("radiusKm", "50"))
			.andExpect(jsonPath("$.page.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].organizationId").value(marsa));
		mvc.perform(get("/providers").param("q", tag)).andExpect(jsonPath("$.content[0].distanceKm").doesNotExist());
		mvc.perform(get("/providers/" + sfax)).andExpect(jsonPath("$.latitude").value(34.7406));
	}

	@Test
	void locationMustBeInTunisiaAndGovernorateCentresArePublic() throws Exception {
		call(register(),
				post("/organizations").content(org("Paris", "Tunis", ",\"latitude\":48.85,\"longitude\":2.35")))
			.andExpect(jsonPath("$.code").value("ORGANIZATION_LOCATION_INVALID"));
		call(register(), post("/organizations").content(org("Demi", "Tunis", ",\"latitude\":36.8")))
			.andExpect(jsonPath("$.code").value("ORGANIZATION_LOCATION_INVALID"));
		mvc.perform(get("/providers/governorates"))
			.andExpect(status().isOk())
			.andExpect(jsonPath("$.length()").value(24))
			.andExpect(jsonPath("$[?(@.name == 'Sfax')].latitude").value(34.7406));
	}

	private Integer provider(String owner, String admin, String name, String governorate, String location)
			throws Exception {
		Integer id = JsonPath.read(body(call(owner, post("/organizations").content(org(name, governorate, location)))
			.andExpect(status().isCreated())), "$.organization.id");
		List<Integer> services = JsonPath.read(body(mvc.perform(get("/catalog/services"))), "$[*].id");
		call(owner, post("/organizations/" + id + "/services")
			.content("{\"serviceId\":" + services.getFirst() + ",\"atHome\":false}"));
		call(admin, post("/admin/organizations/" + id + "/approve")).andExpect(status().isOk());
		return id;
	}

	private static String org(String name, String governorate, String location) {
		return "{\"name\":\"" + name + "\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\""
				+ governorate + "\",\"city\":\"Centre\"" + location + "}";
	}

	private ResultActions call(String token, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", token).contentType(MediaType.APPLICATION_JSON));
	}

	private static String body(ResultActions result) throws Exception {
		return result.andReturn().getResponse().getContentAsString();
	}

	private String register() throws Exception {
		String body = body(mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + UUID.randomUUID()
					+ "@example.com\",\"password\":\"Secret@1234\",\"fullName\":\"Garage Geo\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String admin() throws Exception {
		String body = body(mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
