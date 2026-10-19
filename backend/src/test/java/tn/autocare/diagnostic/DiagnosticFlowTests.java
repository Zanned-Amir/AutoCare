package tn.autocare.diagnostic;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class DiagnosticFlowTests {

	@Autowired
	MockMvc mvc;

	@Test
	void clientRunsTheSeededBrakeDiagnostic() throws Exception {
		String client = register();
		String symptoms = body(call(client, get("/diagnostics/symptoms")));
		Integer brakes = ((List<Integer>) JsonPath.read(symptoms, "$[?(@.label == 'Bruit au freinage')].id"))
			.getFirst();
		String flow = body(
				call(client, get("/diagnostics/symptoms/" + brakes)).andExpect(jsonPath("$.rules").doesNotExist()));
		List<Integer> q = JsonPath.read(flow, "$.questions[*].id");

		call(client,
				post("/diagnostics").content("{\"symptomId\":" + brakes + ",\"answers\":{\"" + q.get(0)
						+ "\":\"Grincement aigu\",\"" + q.get(1) + "\":true,\"" + q.get(2) + "\":false}}"))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.matched").value(true))
			.andExpect(jsonPath("$.urgency").value("HIGH"))
			.andExpect(jsonPath("$.possibleCause").value("Fuite ou air dans le circuit de freinage"))
			.andExpect(jsonPath("$.suggestedService.name").value("Freinage"));

		call(client,
				post("/diagnostics").content("{\"symptomId\":" + brakes + ",\"answers\":{\"" + q.get(0)
						+ "\":\"Klaxon\",\"" + q.get(1) + "\":true,\"" + q.get(2) + "\":false}}"))
			.andExpect(jsonPath("$.code").value("DIAGNOSTIC_ANSWERS_INVALID"));

		String vehicle = body(call(register(), post("/vehicles")
			.content("{\"brand\":\"Kia\",\"model\":\"Rio\",\"year\":2020,\"fuelType\":\"ESSENCE\",\"mileage\":1000}")));
		call(client, post("/diagnostics").content(
				"{\"symptomId\":" + brakes + ",\"vehicleId\":" + JsonPath.read(vehicle, "$.id") + ",\"answers\":{}}"))
			.andExpect(status().isNotFound());

		call(client, get("/diagnostics")).andExpect(jsonPath("$.page.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].symptomLabel").value("Bruit au freinage"));
	}

	@Test
	void adminBuildsASymptomWithPrioritizedRules() throws Exception {
		String admin = login();
		call(register(), get("/admin/diagnostics/symptoms")).andExpect(status().isForbidden());

		Integer symptom = JsonPath.read(
				body(call(admin, post("/admin/diagnostics/symptoms").content(
						"{\"label\":\"Batterie test " + UUID.randomUUID() + "\",\"position\":99,\"active\":true}"))),
				"$.id");
		String base = "/admin/diagnostics/symptoms/" + symptom;
		call(admin,
				post(base + "/questions").content(
						"{\"text\":\"Choix\",\"answerType\":\"SINGLE_CHOICE\",\"options\":[\"A\"],\"position\":0}"))
			.andExpect(jsonPath("$.code").value("DIAGNOSTIC_QUESTION_INVALID"));
		Integer km = JsonPath.read(
				body(call(admin,
						post(base + "/questions").content(
								"{\"text\":\"Âge (ans)\",\"answerType\":\"NUMBER\",\"options\":[],\"position\":0}"))),
				"$.id");

		call(admin, post(base + "/rules").content(rule("Faux", km, "EQUALS", "4", 10)))
			.andExpect(jsonPath("$.code").value("DIAGNOSTIC_RULE_INVALID"));
		call(admin, post(base + "/rules").content(rule("Vieille", km, "AT_LEAST", "4", 20)))
			.andExpect(status().isCreated());
		call(admin, post(base + "/rules").content(rule("Très vieille", km, "AT_LEAST", "8", 30)))
			.andExpect(status().isCreated());
		call(admin, get(base)).andExpect(jsonPath("$.rules[0].name").value("Très vieille"));

		String client = register();
		call(client, post("/diagnostics").content("{\"symptomId\":" + symptom + ",\"answers\":{\"" + km + "\":9}}"))
			.andExpect(jsonPath("$.possibleCause").value("Très vieille"));
		call(client, post("/diagnostics").content("{\"symptomId\":" + symptom + ",\"answers\":{\"" + km + "\":2}}"))
			.andExpect(jsonPath("$.matched").value(false));

		call(admin, delete(base + "/questions/" + km))
			.andExpect(jsonPath("$.code").value("DIAGNOSTIC_QUESTION_IN_USE"));
		call(admin, put(base).content("{\"label\":\"Masqué\",\"position\":99,\"active\":false}"))
			.andExpect(status().isOk());
		call(client, get("/diagnostics/symptoms/" + symptom)).andExpect(status().isNotFound());
	}

	@Test
	void adminChangesShowInTheFlowRightAway() throws Exception {
		String admin = login();
		Integer symptom = JsonPath.read(
				body(call(admin, post("/admin/diagnostics/symptoms")
					.content("{\"label\":\"Pneus test " + UUID.randomUUID() + "\",\"position\":99,\"active\":true}"))),
				"$.id");
		String base = "/admin/diagnostics/symptoms/" + symptom;
		Integer km = JsonPath.read(
				body(call(admin,
						post(base + "/questions").content(
								"{\"text\":\"Kilométrage\",\"answerType\":\"NUMBER\",\"options\":[],\"position\":0}"))),
				"$.id");
		// Each read below fills the cache, so the next write must replace it at once.
		call(admin, get(base)).andExpect(jsonPath("$.questions[0].text").value("Kilométrage"));

		call(admin,
				put(base + "/questions/" + km)
					.content("{\"text\":\"Kilométrage (km)\",\"answerType\":\"NUMBER\",\"options\":[],\"position\":0}"))
			.andExpect(status().isOk());
		call(admin, get(base)).andExpect(jsonPath("$.questions[0].text").value("Kilométrage (km)"));

		Integer ruleId = JsonPath
			.read(body(call(admin, post(base + "/rules").content(rule("Usés", km, "AT_LEAST", "40000", 10)))), "$.id");
		call(admin, get(base)).andExpect(jsonPath("$.rules[0].name").value("Usés"));
		call(admin, put(base + "/rules/" + ruleId).content(rule("Très usés", km, "AT_LEAST", "80000", 10)))
			.andExpect(status().isOk());
		call(admin, get(base)).andExpect(jsonPath("$.rules[0].name").value("Très usés"));
		call(admin, delete(base + "/rules/" + ruleId)).andExpect(status().isNoContent());
		call(admin, get(base)).andExpect(jsonPath("$.rules").isEmpty());

		call(admin, put(base).content("{\"label\":\"Pneus renommé\",\"position\":99,\"active\":true}"))
			.andExpect(status().isOk());
		call(admin, get(base)).andExpect(jsonPath("$.symptom.label").value("Pneus renommé"));
		call(admin, delete(base + "/questions/" + km)).andExpect(status().isNoContent());
		call(admin, get(base)).andExpect(jsonPath("$.questions").isEmpty());
	}

	private static String rule(String name, Integer question, String operator, String value, int priority) {
		return "{\"name\":\"" + name + "\",\"conditions\":[{\"questionId\":" + question + ",\"operator\":\"" + operator
				+ "\",\"value\":\"" + value + "\"}],\"priority\":" + priority + ",\"possibleCause\":\"" + name
				+ "\",\"recommendation\":\"Tester\",\"urgency\":\"LOW\"}";
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
					+ "@example.com\",\"password\":\"Secret@1234\",\"fullName\":\"Client Diag\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

	private String login() throws Exception {
		String body = body(mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
