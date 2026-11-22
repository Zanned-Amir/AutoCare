package tn.autocare.assistant;

import static org.awaitility.Awaitility.await;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
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
import tn.autocare.assistant.service.AssistantService;

/**
 * The assistant is off in tests (no Kafka, no ai-service): the chat refuses cleanly, and a
 * suggestion coming from ai-service becomes a notification for the vehicle's owner only.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AssistantFlowTests {

	@Autowired
	MockMvc mvc;

	@Autowired
	AssistantService assistantService;

	@Test
	void chatIsRefusedWhileTheAssistantIsOff() throws Exception {
		String client = register("Client Assistant");
		call(client, post("/assistant/messages").content("{\"message\":\"\"}"))
			.andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
		call(client, post("/assistant/messages").content("{\"message\":\"Bruit au freinage\"}"))
			.andExpect(status().isServiceUnavailable())
			.andExpect(jsonPath("$.code").value("ASSISTANT_UNAVAILABLE"));
	}

	@Test
	void suggestionNotifiesTheVehicleOwnerOnly() throws Exception {
		String client = register("Client Suggestion");
		Long userId = userId(client);
		String vehicle = "{\"brand\":\"Renault\",\"model\":\"Clio\",\"year\":2019,\"fuelType\":\"ESSENCE\","
				+ "\"mileage\":61000}";
		Long vehicleId = ((Integer) JsonPath.read(body(call(client, post("/vehicles").content(vehicle))), "$.id"))
			.longValue();
		String stranger = register("Autre Suggestion");

		assistantService.publishAssistantMaintenanceSuggestion(userId(stranger), vehicleId, 61000, 11000);
		assistantService.publishAssistantMaintenanceSuggestion(userId, vehicleId, 61000, 11000);

		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> call(client, get("/notifications"))
				.andExpect(jsonPath("$.content[0].type").value("ASSISTANT_MAINTENANCE_SUGGESTED"))
				.andExpect(jsonPath("$.content[0].body").value(containsString("Renault Clio")))
				.andExpect(jsonPath("$.content[0].resourceId").value(vehicleId.intValue())));
		call(stranger, get("/notifications")).andExpect(jsonPath("$.page.totalElements").value(0));
	}

	private Long userId(String token) throws Exception {
		return ((Integer) JsonPath.read(body(call(token, get("/me"))), "$.id")).longValue();
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

}
