package tn.autocare.helpdesk;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;
import tn.autocare.helpdesk.service.SlaMonitor;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;

/** Helpdesk (template: helpdesk): tickets, agent workspace, SLA. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class HelpdeskFlowTests {

	private static final String TICKET = """
			{"subject":"Garage absent au rendez-vous","description":"Personne n'est venu pour la vidange.","category":"SERVICE_REQUEST","referenceType":"SERVICE_REQUEST","referenceId":"42"}""";

	@Autowired
	MockMvc mvc;

	@Autowired
	JdbcTemplate jdbc;

	@Autowired
	SlaMonitor slaMonitor;

	@MockitoBean
	MailService mailService;

	private Session agent;

	@BeforeEach
	void loginAgent() throws Exception {
		agent = login("admin@autocare.tn", "Admin@123456", "backoffice");
	}

	@Test
	void customerAndAgentWorkATicketToTheEnd() throws Exception {
		Session customer = register();
		call(customer,
				post("/helpdesk/tickets")
					.content(TICKET.replace("\"category\"", "\"priority\":\"URGENT\",\"category\"")))
			.andExpect(jsonPath("$.code").value("TICKET_PRIORITY_NOT_ALLOWED"));
		String id = createTicket(customer);
		call(register(), get("/helpdesk/tickets/" + id)).andExpect(status().isNotFound());

		call(agent, get("/admin/helpdesk/tickets/" + id)).andExpect(jsonPath("$.firstResponseDueAt").exists())
			.andExpect(jsonPath("$.customerName").value("Client Test"));
		call(agent, post("/admin/helpdesk/tickets/" + id + "/pick"))
			.andExpect(jsonPath("$.status").value("IN_PROGRESS"));

		call(agent,
				post("/admin/helpdesk/tickets/" + id + "/messages")
					.content("{\"body\":\"Client déjà relancé deux fois\",\"internal\":true}"))
			.andExpect(status().isCreated());
		call(agent, post("/admin/helpdesk/tickets/" + id + "/messages")
			.content("{\"body\":\"Nous avons contacté le garage, il vous rappelle.\",\"internal\":false}"));
		call(agent, get("/admin/helpdesk/tickets/" + id)).andExpect(jsonPath("$.status").value("WAITING_ON_CUSTOMER"))
			.andExpect(jsonPath("$.slaPaused").value(true))
			.andExpect(jsonPath("$.firstResponseAt").exists());
		assertThat(lastMail("helpdesk-ticket-reply").variables()).containsEntry("ticketId", id);

		// The customer never sees the internal note.
		call(customer, get("/helpdesk/tickets/" + id + "/messages")).andExpect(jsonPath("$.length()").value(1));
		call(customer, post("/helpdesk/tickets/" + id + "/messages").content("{\"body\":\"Merci, c'est réglé.\"}"));
		call(customer, get("/helpdesk/tickets/" + id)).andExpect(jsonPath("$.status").value("IN_PROGRESS"));

		call(agent, patch("/admin/helpdesk/tickets/" + id + "/status").content("{\"status\":\"RESOLVED\"}"));
		assertThat(lastMail("helpdesk-ticket-resolved")).isNotNull();
		call(customer, post("/helpdesk/tickets/" + id + "/reopen"))
			.andExpect(jsonPath("$.status").value("IN_PROGRESS"));
		call(customer, post("/helpdesk/tickets/" + id + "/close")).andExpect(jsonPath("$.status").value("CLOSED"));
		call(customer, post("/helpdesk/tickets/" + id + "/messages").content("{\"body\":\"Encore moi\"}"))
			.andExpect(jsonPath("$.code").value("TICKET_CLOSED"));

		List<String> events = JsonPath.read(call(agent, get("/admin/helpdesk/tickets/" + id + "/events")).andReturn()
			.getResponse()
			.getContentAsString(), "$[*].type");
		assertThat(events).contains("CREATED", "ASSIGNED", "STATUS_CHANGED", "REOPENED");
	}

	@Test
	void escalationRaisesPriorityAndTightensTheSla() throws Exception {
		String id = createTicket(register());
		String before = JsonPath.read(
				call(agent, get("/admin/helpdesk/tickets/" + id)).andReturn().getResponse().getContentAsString(),
				"$.resolutionDueAt");
		call(agent, post("/admin/helpdesk/tickets/" + id + "/escalate").content("{\"reason\":\"Client VIP\"}"))
			.andExpect(jsonPath("$.priority").value("HIGH"))
			.andExpect(jsonPath("$.escalationLevel").value(1));
		String after = JsonPath.read(
				call(agent, get("/admin/helpdesk/tickets/" + id)).andReturn().getResponse().getContentAsString(),
				"$.resolutionDueAt");
		assertThat(Instant.parse(after)).isBefore(Instant.parse(before));
	}

	@Test
	void slaMonitorFlagsBreachesAndAutoClosesOldResolvedTickets() throws Exception {
		String late = createTicket(register());
		jdbc.update(
				"UPDATE helpdesk.tickets SET first_response_due_at = now() - interval '1 minute' WHERE public_id = ?",
				late);
		String old = createTicket(register());
		call(agent, patch("/admin/helpdesk/tickets/" + old + "/status").content("{\"status\":\"RESOLVED\"}"));
		jdbc.update("UPDATE helpdesk.tickets SET resolved_at = now() - interval '8 days' WHERE public_id = ?", old);

		slaMonitor.checkSla(Instant.now());

		call(agent, get("/admin/helpdesk/tickets/" + late)).andExpect(jsonPath("$.firstResponseBreachedAt").exists());
		call(agent, get("/admin/helpdesk/tickets/" + old)).andExpect(jsonPath("$.status").value("CLOSED"));
		call(agent, get("/admin/helpdesk/stats")).andExpect(jsonPath("$.activeBreached").isNumber());
		call(agent, get("/admin/helpdesk/queue")).andExpect(status().isOk());
	}

	@Test
	void organizationsShareTheirTicketsWithMembers() throws Exception {
		Session owner = register();
		String org = call(owner, post("/organizations").content(
				"{\"name\":\"Garage Support\",\"type\":\"PROVIDER\",\"phone\":\"71000000\",\"governorate\":\"Tunis\",\"city\":\"Bardo\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		Integer orgId = JsonPath.read(org, "$.organization.id");
		String base = "/organizations/" + orgId + "/helpdesk/tickets";
		call(owner, post(base).content(TICKET.replace("SERVICE_REQUEST\",\"ref", "BILLING\",\"ref")))
			.andExpect(status().isCreated());
		call(owner, get(base)).andExpect(jsonPath("$.page.totalElements").value(1));
		call(register(), get(base)).andExpect(status().isForbidden());
		// Organization tickets are not in the owner's personal list.
		call(owner, get("/helpdesk/tickets")).andExpect(jsonPath("$.page.totalElements").value(0));
	}

	@Test
	void supportAgentsWorkTheQueueButCannotChangeSlaPolicies() throws Exception {
		Session future = register();
		call(agent, put("/admin/users/" + future.id() + "/roles").content("{\"roles\":[\"USER\",\"SUPPORT\"]}"))
			.andExpect(status().isOk());
		Session support = login(future.email(), "Secret@1234", "backoffice");
		call(support, get("/admin/helpdesk/queue")).andExpect(status().isOk());
		call(support,
				put("/admin/helpdesk/sla-policies/LOW")
					.content("{\"firstResponseMinutes\":60,\"resolutionMinutes\":600,\"active\":true}"))
			.andExpect(status().isForbidden());

		String id = createTicket(register());
		call(agent, post("/admin/helpdesk/tickets/" + id + "/assign").content("{\"agentId\":" + future.id() + "}"))
			.andExpect(jsonPath("$.assigneeId").value(future.id()));
		call(agent, post("/admin/helpdesk/tickets/" + id + "/assign").content("{\"agentId\":" + register().id() + "}"))
			.andExpect(jsonPath("$.code").value("TICKET_ASSIGNEE_INVALID"));
	}

	private record Session(Long id, String email, String token) {
	}

	private String createTicket(Session customer) throws Exception {
		String body = call(customer, post("/helpdesk/tickets").content(TICKET)).andExpect(status().isCreated())
			.andExpect(jsonPath("$.publicId").value(org.hamcrest.Matchers.startsWith("TK-")))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return JsonPath.read(body, "$.publicId");
	}

	private Session register() throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Client Test\"}"))
			.andReturn()
			.getResponse()
			.getContentAsString();
		return toSession(email, body);
	}

	private Session login(String email, String password, String scope) throws Exception {
		String body = mvc
			.perform(post("/auth/c/login").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\",\"scope\":\"" + scope + "\"}"))
			.andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return toSession(email, body);
	}

	private static Session toSession(String email, String body) {
		Integer id = JsonPath.read(body, "$.user.id");
		return new Session(id.longValue(), email, "Bearer " + JsonPath.read(body, "$.accessToken"));
	}

	private ResultActions call(Session session, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", session.token()).contentType(MediaType.APPLICATION_JSON));
	}

	private MailMessage lastMail(String template) {
		ArgumentCaptor<MailMessage> captor = ArgumentCaptor.forClass(MailMessage.class);
		verify(mailService, atLeastOnce()).send(captor.capture());
		return captor.getAllValues()
			.reversed()
			.stream()
			.filter(m -> m.template().equals(template))
			.findFirst()
			.orElseThrow();
	}

}
