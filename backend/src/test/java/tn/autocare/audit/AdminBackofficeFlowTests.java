package tn.autocare.audit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
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
 * Backoffice oversight across modules: requests, a user's page, an organization's team
 * and offer, catalog deactivation, and the audit trail those actions leave.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class AdminBackofficeFlowTests {

	static final String EVERY_DAY = "{\"workingHours\":{\"mon\":\"08:00-18:00\",\"tue\":\"08:00-18:00\","
			+ "\"wed\":\"08:00-18:00\",\"thu\":\"08:00-18:00\",\"fri\":\"08:00-18:00\",\"sat\":\"08:00-18:00\","
			+ "\"sun\":\"08:00-18:00\"},\"slotMinutes\":60,\"slotCapacity\":2}";

	static final LocalDate TOMORROW = LocalDate.now(ZoneId.of("Africa/Tunis")).plusDays(1);

	@Autowired
	MockMvc mvc;

	@Test
	void adminSearchesEveryRequestAndSeesTodaysFigures() throws Exception {
		String admin = admin();
		long before = ((Number) JsonPath.read(body(call(admin, get("/admin/service-requests/stats"))),
				"$.createdToday"))
			.longValue();

		Account owner = register("Garage Supervisé");
		Integer orgId = createProvider(owner.token());
		Integer vidange = catalogServiceId("Vidange");
		call(owner.token(), post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + vidange + ",\"atHome\":false}")).andExpect(status().isCreated());
		call(owner.token(), put("/organizations/" + orgId + "/schedule").content(EVERY_DAY)).andExpect(status().isOk());
		Account client = register("Client Supervisé");
		Integer vehicle = createVehicle(client.token());
		Integer requestId = JsonPath.read(body(call(client.token(),
				post("/service-requests").content("{\"organizationId\":" + orgId + ",\"serviceId\":" + vidange
						+ ",\"vehicleId\":" + vehicle + ",\"desiredDate\":\"" + TOMORROW
						+ "\",\"desiredTime\":\"10:00\",\"locationType\":\"AT_PROVIDER\"}"))
			.andExpect(status().isCreated())), "$.id");

		call(client.token(), get("/admin/service-requests")).andExpect(status().isForbidden());
		call(admin, get("/admin/service-requests?organizationId=" + orgId + "&status=PENDING"))
			.andExpect(jsonPath("$.page.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].id").value(requestId))
			.andExpect(jsonPath("$.content[0].customer.fullName").value("Client Supervisé"))
			.andExpect(jsonPath("$.content[0].organization.id").value(orgId));
		call(admin, get("/admin/service-requests?userId=" + client.id() + "&from=" + TOMORROW))
			.andExpect(jsonPath("$.page.totalElements").value(0));
		call(admin, get("/admin/service-requests?userId=" + client.id() + "&to=" + TOMORROW))
			.andExpect(jsonPath("$.page.totalElements").value(1));
		Integer freinage = catalogServiceId("Freinage");
		call(admin, get("/admin/service-requests?userId=" + client.id() + "&serviceIds=" + freinage))
			.andExpect(jsonPath("$.page.totalElements").value(0));
		call(admin, get("/admin/service-requests?userId=" + client.id() + "&serviceIds=" + freinage + "," + vidange))
			.andExpect(jsonPath("$.page.totalElements").value(1));
		call(admin, get("/admin/service-requests/" + requestId + "/history"))
			.andExpect(jsonPath("$[0].toStatus").value("PENDING"));

		String calendar = "/organizations/" + orgId + "/service-requests/calendar?from=" + TOMORROW.minusDays(1)
				+ "&to=" + TOMORROW.plusDays(6);
		call(owner.token(), get(calendar)).andExpect(jsonPath("$[0].id").value(requestId))
			.andExpect(jsonPath("$[0].desiredTime").value("10:00:00"));
		call(client.token(), get(calendar)).andExpect(status().isForbidden());
		call(owner.token(), get("/organizations/" + orgId + "/service-requests/calendar?from=" + TOMORROW + "&to="
				+ TOMORROW.plusDays(90)))
			.andExpect(status().isBadRequest());

		String stats = body(call(admin, get("/admin/service-requests/stats")));
		assertThat(((Number) JsonPath.read(stats, "$.createdToday")).longValue()).isGreaterThan(before);
		assertThat(((Number) JsonPath.read(stats, "$.byStatus.PENDING")).longValue()).isPositive();

		call(admin, get("/admin/users/" + client.id() + "/vehicles")).andExpect(jsonPath("$[0].id").value(vehicle));
		call(admin, get("/admin/users/" + owner.id() + "/organizations"))
			.andExpect(jsonPath("$[0].organization.id").value(orgId))
			.andExpect(jsonPath("$[0].roleKey").value("PROVIDER_OWNER"));
		call(admin, get("/admin/organizations/" + orgId + "/services"))
			.andExpect(jsonPath("$[0].serviceId").value(vidange));
	}

	@Test
	void adminManagesTheTeamOfAnOrganizationAndLeavesAnAuditTrail() throws Exception {
		String admin = admin();
		Account owner = register("Propriétaire");
		Account technician = register("Technicien");
		Integer orgId = createProvider(owner.token());
		String members = "/admin/organizations/" + orgId + "/members";

		call(owner.token(), post(members).content(member(technician.email(), "PROVIDER_TECHNICIAN")))
			.andExpect(status().isForbidden());
		Integer memberId = JsonPath
			.read(body(call(admin, post(members).content(member(technician.email(), "PROVIDER_TECHNICIAN")))
				.andExpect(status().isCreated())), "$.id");
		call(admin, put(members + "/" + memberId + "/role").content("{\"roleKey\":\"PROVIDER_MANAGER\"}"))
			.andExpect(jsonPath("$.roleKey").value("PROVIDER_MANAGER"));
		call(technician.token(), get("/organizations/" + orgId)).andExpect(status().isOk());
		call(admin, put(members + "/" + memberId + "/status").content("{\"status\":\"SUSPENDED\"}"))
			.andExpect(jsonPath("$.status").value("SUSPENDED"));
		call(technician.token(), get("/organizations/" + orgId)).andExpect(status().isForbidden());
		call(admin, delete(members + "/" + memberId)).andExpect(status().isNoContent());

		String ownerMembers = body(call(admin, get(members)));
		Integer ownerMemberId = JsonPath.read(ownerMembers, "$[0].id");
		call(admin, delete(members + "/" + ownerMemberId)).andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("LAST_MEMBER_MANAGER"));
		call(admin, post("/admin/organizations/" + orgId + "/suspend")).andExpect(status().isOk());

		String audit = "/admin/audit-logs?targetType=ORGANIZATION&targetId=" + orgId;
		call(owner.token(), get(audit)).andExpect(status().isForbidden());
		await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
			String logs = body(call(admin, get(audit)));
			List<String> actions = JsonPath.read(logs, "$.content[*].action");
			assertThat(actions).containsExactly("ORGANIZATION_SUSPENDED", "ORGANIZATION_MEMBER_REMOVED",
					"ORGANIZATION_MEMBER_STATUS_CHANGED", "ORGANIZATION_MEMBER_ROLE_CHANGED",
					"ORGANIZATION_MEMBER_ADDED", "ORGANIZATION_APPROVED");
			assertThat(JsonPath.<String>read(logs, "$.content[0].actorName")).isEqualTo("Admin AutoCare");
			assertThat(JsonPath.<String>read(logs, "$.content[1].details.memberName")).isEqualTo("Technicien");
		});
	}

	@Test
	void adminSuspendsAUserAndDeactivatesAServiceWithATrace() throws Exception {
		String admin = admin();
		Account user = register("Client Suspendu");
		call(admin, get("/admin/users/" + user.id())).andExpect(jsonPath("$.fullName").value("Client Suspendu"));
		call(admin, post("/admin/users/" + user.id() + "/suspend")).andExpect(jsonPath("$.active").value(false));
		call(admin, post("/admin/users/" + user.id() + "/unsuspend")).andExpect(jsonPath("$.active").value(true));
		call(admin, put("/admin/users/" + user.id() + "/roles").content("{\"roles\":[\"USER\",\"SUPPORT\"]}"))
			.andExpect(status().isOk());

		// A seeded service, put back at the end: other tests count the catalog.
		Integer serviceId = catalogServiceId("Climatisation");
		call(admin, get("/catalog/services"))
			.andExpect(jsonPath("$[?(@.id == " + serviceId + ")].icon").value("snowflake"));
		String update = "{\"name\":\"Climatisation\",\"description\":\"Air conditioning recharge and repair\","
				+ "\"active\":true,\"icon\":\"%s\"}";
		call(admin, put("/admin/catalog/services/" + serviceId).content(update.formatted("Not An Icon!")))
			.andExpect(status().isBadRequest());
		call(admin, put("/admin/catalog/services/" + serviceId).content(update.formatted("fan")))
			.andExpect(jsonPath("$.icon").value("fan"));
		call(admin, put("/admin/catalog/services/" + serviceId).content(update.formatted("snowflake")))
			.andExpect(jsonPath("$.icon").value("snowflake"));
		int offeredBefore = providerCount(admin, serviceId);
		Account owner = register("Garage Clim");
		Integer orgId = createProvider(owner.token());
		call(owner.token(), post("/organizations/" + orgId + "/services")
			.content("{\"serviceId\":" + serviceId + ",\"atHome\":true}")).andExpect(status().isCreated());
		assertThat(providerCount(admin, serviceId)).isEqualTo(offeredBefore + 1);

		call(admin, post("/admin/catalog/services/" + serviceId + "/deactivate"))
			.andExpect(jsonPath("$.active").value(false));
		List<Integer> active = JsonPath.read(body(mvc.perform(get("/catalog/services"))), "$[*].id");
		assertThat(active).doesNotContain(serviceId);
		call(admin, post("/admin/catalog/services/" + serviceId + "/reactivate"))
			.andExpect(jsonPath("$.active").value(true));

		await().atMost(Duration.ofSeconds(10)).untilAsserted(() -> {
			List<String> userActions = JsonPath.read(
					body(call(admin, get("/admin/audit-logs?targetType=USER&targetId=" + user.id()))),
					"$.content[*].action");
			assertThat(userActions).containsExactly("USER_ROLES_CHANGED", "USER_UNSUSPENDED", "USER_SUSPENDED");
			List<String> serviceActions = JsonPath.read(
					body(call(admin, get("/admin/audit-logs?targetType=AUTO_SERVICE&targetId=" + serviceId))),
					"$.content[*].action");
			assertThat(serviceActions).containsExactly("AUTO_SERVICE_REACTIVATED", "AUTO_SERVICE_DEACTIVATED");
		});
	}

	@Test
	void backofficeListsFilterBySearchAndChips() throws Exception {
		String admin = admin();
		String marker = UUID.randomUUID().toString().substring(0, 8);
		Account agent = register("Agent " + marker);
		call(admin, put("/admin/users/" + agent.id() + "/roles").content("{\"roles\":[\"USER\",\"SUPPORT\"]}"))
			.andExpect(status().isOk());
		Account suspended = register("Suspendu " + marker);
		call(admin, post("/admin/users/" + suspended.id() + "/suspend")).andExpect(status().isOk());

		call(admin, get("/admin/users?q=" + marker)).andExpect(jsonPath("$.page.totalElements").value(2));
		call(admin, get("/admin/users?q=" + marker + "&role=SUPPORT"))
			.andExpect(jsonPath("$.page.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].id").value(agent.id()));
		call(admin, get("/admin/users?q=" + marker + "&active=false"))
			.andExpect(jsonPath("$.page.totalElements").value(1))
			.andExpect(jsonPath("$.content[0].id").value(suspended.id()));

		Account owner = register("Propriétaire " + marker);
		call(owner.token(), post("/organizations").content("{\"name\":\"Atelier " + marker
				+ "\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Sfax\",\"city\":\"Sakiet Ezzit\"}"))
			.andExpect(status().isCreated());
		call(admin, get("/admin/organizations?q=atelier " + marker + "&governorate=Sfax&type=PROVIDER&status=PENDING"))
			.andExpect(jsonPath("$.page.totalElements").value(1));
		call(admin, get("/admin/organizations?q=atelier " + marker + "&governorate=Tunis"))
			.andExpect(jsonPath("$.page.totalElements").value(0));

		call(admin, get("/admin/catalog/services?active=true&size=50"))
			.andExpect(jsonPath("$.content[0].active").value(true));
		call(admin, get("/admin/catalog/services?q=vidange&active=false"))
			.andExpect(jsonPath("$.page.totalElements").value(0));
	}

	private record Account(Integer id, String email, String token) {
	}

	private int providerCount(String admin, Integer serviceId) throws Exception {
		Map<String, Object> counts = JsonPath.read(body(call(admin, get("/admin/catalog/services/provider-counts"))),
				"$");
		Object count = counts.get(String.valueOf(serviceId));
		return count == null ? 0 : ((Number) count).intValue();
	}

	private static String member(String email, String roleKey) {
		return "{\"email\":\"" + email + "\",\"roleKey\":\"" + roleKey + "\"}";
	}

	private Integer createProvider(String owner) throws Exception {
		String org = body(call(owner, post("/organizations").content("{\"name\":\"Garage "
				+ UUID.randomUUID().toString().substring(0, 6)
				+ "\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"La Marsa\"}")));
		Integer orgId = JsonPath.read(org, "$.organization.id");
		call(admin(), post("/admin/organizations/" + orgId + "/approve")).andExpect(status().isOk());
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

	private Account register(String name) throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String body = body(mvc.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"" + name + "\"}")));
		return new Account(JsonPath.read(body, "$.user.id"), email, "Bearer " + JsonPath.read(body, "$.accessToken"));
	}

	private String admin() throws Exception {
		String body = body(mvc.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"admin@autocare.tn\",\"password\":\"Admin@123456\",\"scope\":\"backoffice\"}")));
		return "Bearer " + JsonPath.read(body, "$.accessToken");
	}

}
