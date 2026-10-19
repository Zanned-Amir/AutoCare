package tn.autocare.servicerequest;

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
class ServiceRequestFlowTests {

	static final LocalDate TOMORROW = LocalDate.now(ZoneId.of("Africa/Tunis")).plusDays(1);

	@Autowired
	MockMvc mvc;

	@Test
	void clientAndProviderWorkARequestToCompletion() throws Exception {
		String owner = register("Garage Owner");
		Integer orgId = createProvider(owner, true);
		Integer vidange = catalogServiceId("Vidange");
		call(owner,
				post("/organizations/" + orgId + "/services")
					.content("{\"serviceId\":" + vidange + ",\"atHome\":true,\"indicativePrice\":\"60.000\"}"))
			.andExpect(status().isCreated());

		String client = register("Client Demande");
		Integer vehicle = createVehicle(client);
		String body = request(orgId, vidange, vehicle, "HOME", null, TOMORROW);
		call(client, post("/service-requests").content(body))
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_LOCATION_REQUIRED"));
		call(client,
				post("/service-requests")
					.content(request(orgId, vidange, vehicle, "HOME", "La Marsa", TOMORROW.minusDays(3))))
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_DATE_INVALID"));
		call(client,
				post("/service-requests")
					.content(request(orgId, catalogServiceId("Freinage"), vehicle, "AT_PROVIDER", null, TOMORROW)))
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_SERVICE_NOT_OFFERED"));

		String created = body(call(client,
				post("/service-requests")
					.content(request(orgId, vidange, vehicle, "HOME", "12 rue de Carthage, La Marsa", TOMORROW)))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("PENDING"))
			.andExpect(jsonPath("$.service.name").value("Vidange"))
			.andExpect(jsonPath("$.customer").doesNotExist()));
		Integer requestId = JsonPath.read(created, "$.id");
		String base = "/organizations/" + orgId + "/service-requests";

		call(register("Curieux"), get("/service-requests/" + requestId)).andExpect(status().isNotFound());
		call(client, post(base + "/" + requestId + "/confirm")).andExpect(status().isForbidden());

		call(owner, get(base + "?status=PENDING")).andExpect(jsonPath("$.page.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].customer.fullName").value("Client Demande"));
		call(owner, post(base + "/" + requestId + "/confirm")).andExpect(jsonPath("$.status").value("CONFIRMED"));
		call(owner, post(base + "/" + requestId + "/start")).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
		call(client, post("/service-requests/" + requestId + "/cancel"))
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_STATUS_INVALID"));
		call(owner, post(base + "/" + requestId + "/complete").content(
				"{\"mileage\":91000,\"result\":\"Vidange 5W30 + filtre\",\"recommendations\":\"Plaquettes à surveiller\"}"))
			.andExpect(jsonPath("$.status").value("COMPLETED"))
			.andExpect(jsonPath("$.completedAt").exists());

		call(client, get("/vehicles/" + vehicle)).andExpect(jsonPath("$.mileage").value(91000));
		List<String> actors = JsonPath.read(body(call(client, get("/service-requests/" + requestId + "/history"))),
				"$[*].actor");
		org.assertj.core.api.Assertions.assertThat(actors)
			.containsExactly("CLIENT", "PROVIDER", "PROVIDER", "PROVIDER");
		call(owner, get(base + "/counts")).andExpect(jsonPath("$.COMPLETED").value(1));
	}

	@Test
	void unapprovedProvidersAndRejectionsAreHandled() throws Exception {
		String owner = register("Garage Pending");
		Integer pendingOrg = createProvider(owner, false);
		Integer approvedOrg = createProvider(owner, true);
		Integer vidange = catalogServiceId("Vidange");
		for (Integer org : List.of(pendingOrg, approvedOrg)) {
			call(owner, post("/organizations/" + org + "/services")
				.content("{\"serviceId\":" + vidange + ",\"atHome\":false}"));
		}
		String client = register("Client Refus");
		Integer vehicle = createVehicle(client);
		call(client,
				post("/service-requests").content(request(pendingOrg, vidange, vehicle, "AT_PROVIDER", null, TOMORROW)))
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_PROVIDER_UNAVAILABLE"));

		Integer first = JsonPath
			.read(body(
					call(client,
							post("/service-requests")
								.content(request(approvedOrg, vidange, vehicle, "AT_PROVIDER", null, TOMORROW)))),
					"$.id");
		String base = "/organizations/" + approvedOrg + "/service-requests/";
		call(owner, post(base + first + "/reject").content("{\"reason\":\"\"}")).andExpect(status().isBadRequest());
		call(owner, post(base + first + "/reject").content("{\"reason\":\"Complet ce jour-là\"}"))
			.andExpect(jsonPath("$.rejectionReason").value("Complet ce jour-là"));

		Integer second = JsonPath
			.read(body(
					call(client,
							post("/service-requests")
								.content(request(approvedOrg, vidange, vehicle, "AT_PROVIDER", null, TOMORROW)))),
					"$.id");
		call(client, post("/service-requests/" + second + "/cancel").content("{\"reason\":\"Plus besoin\"}"))
			.andExpect(jsonPath("$.status").value("CANCELLED"));
		call(client, get("/service-requests?status=CANCELLED")).andExpect(jsonPath("$.page.totalElements").value(1));
	}

	@Test
	void providerQuotesAndTheClientAcceptsOrDeclines() throws Exception {
		String owner = register("Garage Devis");
		Integer orgId = createProvider(owner, true);
		Integer freinage = catalogServiceId("Freinage");
		call(owner, post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + freinage + ",\"atHome\":false}")).andExpect(status().isCreated());
		String client = register("Client Devis");
		Integer vehicle = createVehicle(client);
		Integer requestId = JsonPath.read(body(call(client,
				post("/service-requests").content(request(orgId, freinage, vehicle, "AT_PROVIDER", null, TOMORROW)))),
				"$.id");
		String quote = "/organizations/" + orgId + "/service-requests/" + requestId + "/quote";
		String mine = "/service-requests/" + requestId;

		call(client, post(mine + "/quote/accept")).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("QUOTE_NOT_PENDING"));
		call(client, post(quote).content("{\"amount\":\"120.500\"}")).andExpect(status().isForbidden());
		call(owner, post(quote).content("{\"amount\":\"-1\"}")).andExpect(status().isBadRequest());
		call(owner, post(quote).content("{\"amount\":\"120.500\",\"note\":\"Plaquettes avant\"}"))
			.andExpect(jsonPath("$.quote.amount").value("120.500"))
			.andExpect(jsonPath("$.quote.status").value("SENT"));
		call(client, post(mine + "/quote/decline")).andExpect(jsonPath("$.quote.status").value("DECLINED"))
			.andExpect(jsonPath("$.status").value("PENDING"));
		call(owner, post(quote).content("{\"amount\":\"99.000\"}")).andExpect(jsonPath("$.quote.status").value("SENT"));
		call(client, post(mine + "/quote/accept")).andExpect(jsonPath("$.status").value("CONFIRMED"))
			.andExpect(jsonPath("$.quote.status").value("ACCEPTED"))
			.andExpect(jsonPath("$.quote.amount").value("99.000"));
		call(owner, post(quote).content("{\"amount\":\"80.000\"}")).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("QUOTE_NOT_ALLOWED"));
		call(client, get(mine + "/history")).andExpect(jsonPath("$[1].note").value("Devis accepté"));
		call(owner, get("/organizations/" + orgId + "/service-requests/insights?weeks=4"))
			.andExpect(jsonPath("$.weeks.length()").value(4))
			.andExpect(jsonPath("$.weeks[3].created").value(1))
			.andExpect(jsonPath("$.received").value(1))
			.andExpect(jsonPath("$.acceptRate").value(1.0))
			.andExpect(jsonPath("$.acceptedQuotes").value("99.000"))
			.andExpect(jsonPath("$.topServices[0].name").value("Freinage"));
		call(client, get("/organizations/" + orgId + "/service-requests/insights")).andExpect(status().isForbidden());
	}

	@Test
	void clientAndGarageChatOnARequestUntilItIsClosed() throws Exception {
		String owner = register("Garage Chat");
		Integer orgId = createProvider(owner, true);
		Integer vidange = catalogServiceId("Vidange");
		call(owner, post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + vidange + ",\"atHome\":false}")).andExpect(status().isCreated());
		String client = register("Client Chat");
		Integer vehicle = createVehicle(client);
		Integer requestId = JsonPath.read(body(call(client,
				post("/service-requests").content(request(orgId, vidange, vehicle, "AT_PROVIDER", null, TOMORROW)))),
				"$.id");
		String mine = "/service-requests/" + requestId + "/messages";
		String theirs = "/organizations/" + orgId + "/service-requests/" + requestId + "/messages";

		call(client, post(mine).content("{\"body\":\"  \"}")).andExpect(status().isBadRequest());
		call(register("Curieux Chat"), get(mine)).andExpect(status().isNotFound());
		call(client, post(mine).content("{\"body\":\"Bonjour, 9h ça vous va ?\"}")).andExpect(status().isCreated())
			.andExpect(jsonPath("$.side").value("CLIENT"))
			.andExpect(jsonPath("$.mine").value(true));
		call(owner, post(theirs).content("{\"body\":\"Oui, à demain.\"}")).andExpect(status().isCreated());

		call(owner, get(theirs)).andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].authorName").value("Client Chat"))
			.andExpect(jsonPath("$[0].mine").value(false))
			.andExpect(jsonPath("$[1].mine").value(true));
		call(client, get(mine)).andExpect(jsonPath("$[1].side").value("PROVIDER"))
			.andExpect(jsonPath("$[1].authorName").doesNotExist())
			.andExpect(jsonPath("$[1].body").value("Oui, à demain."));

		call(client, post("/service-requests/" + requestId + "/cancel")).andExpect(status().isOk());
		call(owner, post(theirs).content("{\"body\":\"Dommage\"}")).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_CHAT_CLOSED"));
	}

	@Test
	void clientsBookFreeSlotsOnly() throws Exception {
		String owner = register("Garage Creneaux");
		Integer orgId = createProvider(owner, true);
		Integer vidange = catalogServiceId("Vidange");
		call(owner, post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + vidange + ",\"atHome\":false}")).andExpect(status().isCreated());
		String days = "\"mon\":\"09:00-11:00\",\"tue\":\"09:00-11:00\",\"wed\":\"09:00-11:00\",\"thu\":\"09:00-11:00\","
				+ "\"fri\":\"09:00-11:00\",\"sat\":\"09:00-11:00\",\"sun\":\"09:00-11:00\"";
		call(owner,
				put("/organizations/" + orgId + "/schedule")
					.content("{\"workingHours\":{\"mon\":\"9h-11h\"},\"slotMinutes\":60,\"slotCapacity\":1}"))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ORGANIZATION_SCHEDULE_INVALID"));
		call(owner,
				put("/organizations/" + orgId + "/schedule")
					.content("{\"workingHours\":{" + days + "},\"slotMinutes\":60,\"slotCapacity\":1}"))
			.andExpect(jsonPath("$.slotCapacity").value(1));

		String slots = "/providers/" + orgId + "/slots?date=" + TOMORROW;
		mvc.perform(get(slots))
			.andExpect(jsonPath("$.length()").value(2))
			.andExpect(jsonPath("$[0].time").value("09:00:00"))
			.andExpect(jsonPath("$[0].remaining").value(1));

		String client = register("Client Creneau");
		Integer vehicle = createVehicle(client);
		String booking = request(orgId, vidange, vehicle, "AT_PROVIDER", null, TOMORROW);
		call(client, post("/service-requests").content(booking.replace("}", ",\"desiredTime\":\"09:00\"}")))
			.andExpect(status().isCreated());
		mvc.perform(get(slots)).andExpect(jsonPath("$[0].remaining").value(0));
		call(client, post("/service-requests").content(booking.replace("}", ",\"desiredTime\":\"09:00\"}")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_SLOT_UNAVAILABLE"));
		call(client, post("/service-requests").content(booking.replace("}", ",\"desiredTime\":\"12:00\"}")))
			.andExpect(jsonPath("$.code").value("SERVICE_REQUEST_SLOT_UNAVAILABLE"));
		call(client, post("/service-requests").content(booking.replace("}", ",\"desiredTime\":\"10:00\"}")))
			.andExpect(status().isCreated());
	}

	private static String request(Integer org, Integer service, Integer vehicle, String location, String address,
			LocalDate date) {
		return "{\"organizationId\":" + org + ",\"serviceId\":" + service + ",\"vehicleId\":" + vehicle
				+ ",\"desiredDate\":\"" + date + "\",\"locationType\":\"" + location + "\""
				+ (address == null ? "" : ",\"location\":\"" + address + "\"") + "}";
	}

	private Integer createProvider(String owner, boolean approve) throws Exception {
		String org = body(call(owner, post("/organizations").content("{\"name\":\"Garage "
				+ UUID.randomUUID().toString().substring(0, 6)
				+ "\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"La Marsa\"}")));
		Integer orgId = JsonPath.read(org, "$.organization.id");
		if (approve) {
			call(admin(), post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isOk());
		}
		return orgId;
	}

	private Integer createVehicle(String token) throws Exception {
		return JsonPath.read(body(call(token, post("/vehicles").content(
				"{\"brand\":\"Peugeot\",\"model\":\"208\",\"year\":2021,\"fuelType\":\"ESSENCE\",\"mileage\":80000}"))),
				"$.id");
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
