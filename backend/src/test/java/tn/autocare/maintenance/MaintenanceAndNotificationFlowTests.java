package tn.autocare.maintenance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
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
import tn.autocare.maintenance.service.MaintenanceReminderService;

/**
 * A completed request lands in the vehicle history; both sides are notified along the
 * way.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class MaintenanceAndNotificationFlowTests {

	static final LocalDate TODAY = LocalDate.now(ZoneId.of("Africa/Tunis"));

	@Autowired
	MockMvc mvc;

	@Autowired
	MaintenanceReminderService reminderService;

	@Test
	void completedRequestBecomesHistoryAndNotifiesEachSide() throws Exception {
		String owner = register("Garage Notif");
		Integer orgId = JsonPath.read(body(call(owner, post("/organizations").content(
				"{\"name\":\"Garage Notif\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"Bardo\"}"))),
				"$.organization.id");
		call(admin(), post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isOk());
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> call(owner, get("/notifications"))
				.andExpect(jsonPath("$.content[0].type").value("ORGANIZATION_APPROVED"))
				.andExpect(jsonPath("$.content[0].title").value("Votre entreprise est validée")));

		Integer vidange = catalogServiceId("Vidange");
		call(owner, post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + vidange + ",\"atHome\":false}"));
		String client = register("Client Historique");
		Integer vehicle = JsonPath.read(body(call(client, post("/vehicles").content(
				"{\"brand\":\"Dacia\",\"model\":\"Logan\",\"year\":2018,\"fuelType\":\"DIESEL\",\"mileage\":120000}"))),
				"$.id");
		Integer requestId = JsonPath
			.read(body(call(client,
					post("/service-requests").content("{\"organizationId\":" + orgId + ",\"serviceId\":" + vidange
							+ ",\"vehicleId\":" + vehicle + ",\"desiredDate\":\"" + TODAY.plusDays(2)
							+ "\",\"locationType\":\"AT_PROVIDER\"}"))),
					"$.id");

		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> call(owner, get("/notifications?unreadOnly=true"))
				.andExpect(jsonPath("$.content[0].type").value("SERVICE_REQUEST_CREATED"))
				.andExpect(jsonPath("$.content[0].body")
					.value(org.hamcrest.Matchers.containsString("Client Historique"))));

		String base = "/organizations/" + orgId + "/service-requests/" + requestId;
		call(owner, post(base + "/confirm"));
		call(owner, post(base + "/start"));
		call(owner, post(base + "/complete")
			.content("{\"mileage\":121500,\"result\":\"Huile 5W40\",\"recommendations\":\"Courroie à 150 000 km\"}"));

		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(() -> call(client, get("/vehicles/" + vehicle + "/maintenance-records"))
				.andExpect(jsonPath("$[0].source").value("SERVICE_REQUEST"))
				.andExpect(jsonPath("$[0].mileage").value(121500))
				.andExpect(jsonPath("$[0].description").value("Vidange"))
				.andExpect(jsonPath("$[0].organization.name").value("Garage Notif"))
				.andExpect(jsonPath("$[0].editable").value(false)));
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(
					() -> call(client, get("/notifications/unread-count")).andExpect(jsonPath("$.count").value(3)));

		String notifications = body(call(client, get("/notifications")));
		List<String> types = JsonPath.read(notifications, "$.content[*].type");
		assertThat(types).containsExactlyInAnyOrder("SERVICE_REQUEST_CONFIRMED", "SERVICE_REQUEST_IN_PROGRESS",
				"SERVICE_REQUEST_COMPLETED");
		Integer first = JsonPath.read(notifications, "$.content[0].id");
		call(client, post("/notifications/" + first + "/read")).andExpect(status().isNoContent());
		call(client, get("/notifications/unread-count")).andExpect(jsonPath("$.count").value(2));
		call(client, delete("/notifications/" + first)).andExpect(status().isNoContent());
		call(client, post("/notifications/read-all")).andExpect(status().isNoContent());
		call(client, get("/notifications/unread-count")).andExpect(jsonPath("$.count").value(0));
		call(client, get("/notifications")).andExpect(jsonPath("$.page.totalElements").value(2));
		call(owner, post("/notifications/" + first + "/read")).andExpect(status().isNotFound());

		Integer record = JsonPath.read(body(call(client, get("/vehicles/" + vehicle + "/maintenance-records"))),
				"$[0].id");
		call(client, delete("/vehicles/" + vehicle + "/maintenance-records/" + record))
			.andExpect(jsonPath("$.code").value("MAINTENANCE_RECORD_READ_ONLY"));
		call(owner,
				put("/organizations/" + orgId + "/maintenance-records/" + record + "/report")
					.content("{\"result\":\"Huile 5W40 + filtre\",\"recommendations\":null}"))
			.andExpect(jsonPath("$.result").value("Huile 5W40 + filtre"));
	}

	@Test
	void ownerKeepsAManualHistory() throws Exception {
		String client = register("Client Carnet");
		Integer vehicle = JsonPath.read(body(call(client, post("/vehicles").content(
				"{\"brand\":\"Fiat\",\"model\":\"Tipo\",\"year\":2017,\"fuelType\":\"ESSENCE\",\"mileage\":90000}"))),
				"$.id");
		String history = "/vehicles/" + vehicle + "/maintenance-records";
		call(client, post(history).content(entry(TODAY.plusDays(1), 95000)))
			.andExpect(jsonPath("$.code").value("MAINTENANCE_DATE_INVALID"));
		Integer id = JsonPath.read(body(
				call(client, post(history).content(entry(TODAY.minusDays(10), 95000))).andExpect(status().isCreated())
					.andExpect(jsonPath("$.editable").value(true))),
				"$.id");
		call(client, get("/vehicles/" + vehicle)).andExpect(jsonPath("$.mileage").value(95000));
		call(client, put(history + "/" + id).content(entry(TODAY.minusDays(9), 95500)))
			.andExpect(jsonPath("$.mileage").value(95500));
		call(register("Autre"), get(history)).andExpect(status().isNotFound());
		call(client, delete(history + "/" + id)).andExpect(status().isNoContent());
		call(client, get(history)).andExpect(jsonPath("$.length()").value(0));
	}

	@Test
	void ownerIsRemindedOnceWhenAPlannedMaintenanceIsDue() throws Exception {
		String client = register("Client Rappel");
		Integer vehicle = JsonPath.read(body(call(client, post("/vehicles").content(
				"{\"brand\":\"Kia\",\"model\":\"Rio\",\"year\":2020,\"fuelType\":\"ESSENCE\",\"mileage\":59700}"))),
				"$.id");
		String reminders = "/vehicles/" + vehicle + "/reminders";
		call(client, post(reminders).content("{\"title\":\"Vidange\"}"))
			.andExpect(jsonPath("$.code").value("MAINTENANCE_REMINDER_DUE_REQUIRED"));
		call(register("Autre Rappel"), get(reminders)).andExpect(status().isNotFound());

		Integer byMileage = JsonPath
			.read(body(call(client, post(reminders).content("{\"title\":\"Vidange\",\"dueMileage\":60000}"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.due").value(true))), "$.id");
		Integer later = JsonPath.read(body(call(client,
				post(reminders).content("{\"title\":\"Courroie\",\"dueDate\":\"" + TODAY.plusMonths(6) + "\"}"))
			.andExpect(jsonPath("$.due").value(false))), "$.id");

		reminderService.notifyDueReminders(TODAY);
		reminderService.notifyDueReminders(TODAY);
		await().atMost(Duration.ofSeconds(10))
			.untilAsserted(
					() -> call(client, get("/notifications")).andExpect(jsonPath("$.page.totalElements").value(1))
						.andExpect(jsonPath("$.content[0].type").value("MAINTENANCE_REMINDER_DUE"))
						.andExpect(jsonPath("$.content[0].resourceId").value(vehicle)));
		call(client, get(reminders)).andExpect(jsonPath("$[?(@.id == " + byMileage + ")].notifiedAt").isNotEmpty())
			.andExpect(jsonPath("$[?(@.id == " + later + ")].notifiedAt")
				.value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())));

		call(client, post(reminders + "/" + byMileage + "/done")).andExpect(jsonPath("$.doneAt").exists())
			.andExpect(jsonPath("$.due").value(false));
		call(client, get(reminders)).andExpect(jsonPath("$[0].id").value(later));
		call(client, delete(reminders + "/" + later)).andExpect(status().isNoContent());
		call(client, get(reminders)).andExpect(jsonPath("$.length()").value(1));
	}

	@Test
	void liveStreamOpensForTheSignedInUser() throws Exception {
		call(register("Client Live"), get("/notifications/stream").accept(MediaType.TEXT_EVENT_STREAM))
			.andExpect(request().asyncStarted());
		mvc.perform(get("/notifications/stream")).andExpect(status().isUnauthorized());
	}

	private static String entry(LocalDate date, int mileage) {
		return "{\"date\":\"" + date + "\",\"mileage\":" + mileage
				+ ",\"description\":\"Pneus avant\",\"result\":\"Michelin\"}";
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
