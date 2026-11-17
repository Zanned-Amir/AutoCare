package tn.autocare.organization;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class OrganizationInvitationFlowTests {

	private static final String GARAGE = """
			{"name":"Garage Ennour","type":"PROVIDER","phone":"+216 71 000 000","governorate":"Tunis","city":"La Marsa"}""";

	@Autowired
	MockMvc mvc;

	@MockitoBean
	MailService mailService;

	@Test
	void invitedPersonSignsUpAndJoins() throws Exception {
		User owner = registerUser(randomEmail());
		String org = createOrganization(owner);
		String inviteeEmail = randomEmail();

		call(owner, post(org + "/invitations").content(invitation(inviteeEmail, "PROVIDER_TECHNICIAN")))
			.andExpect(status().isCreated())
			.andExpect(jsonPath("$.status").value("PENDING"));
		call(owner, get(org + "/invitations")).andExpect(jsonPath("$[0].email").value(inviteeEmail));
		String token = lastInvitationToken(inviteeEmail);

		perform(post("/organization-invitations/preview").content(tokenBody(token))).andExpect(status().isOk())
			.andExpect(jsonPath("$.organizationName").value("Garage Ennour"))
			.andExpect(jsonPath("$.roleKey").value("PROVIDER_TECHNICIAN"));

		User stranger = registerUser(randomEmail());
		call(stranger, post("/organization-invitations/accept").content(tokenBody(token)))
			.andExpect(status().isForbidden())
			.andExpect(jsonPath("$.code").value("ORGANIZATION_INVITATION_EMAIL_MISMATCH"));

		User invitee = registerUser(inviteeEmail);
		call(invitee, post("/organization-invitations/accept").content(tokenBody(token))).andExpect(status().isOk())
			.andExpect(jsonPath("$.organizationName").value("Garage Ennour"));
		call(invitee, get("/organizations/mine")).andExpect(jsonPath("$[0].roleKey").value("PROVIDER_TECHNICIAN"));
		call(owner, get(org + "/invitations")).andExpect(jsonPath("$.length()").value(0));

		call(invitee, post("/organization-invitations/accept").content(tokenBody(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ORGANIZATION_INVITATION_INVALID"));
		call(owner, post(org + "/invitations").content(invitation(inviteeEmail, "PROVIDER_TECHNICIAN")))
			.andExpect(status().isConflict())
			.andExpect(jsonPath("$.code").value("MEMBER_ALREADY_EXISTS"));
	}

	@Test
	void revokedInvitationCannotBeAccepted() throws Exception {
		User owner = registerUser(randomEmail());
		String org = createOrganization(owner);
		User invitee = registerUser(randomEmail());

		call(owner, post(org + "/invitations").content(invitation(invitee.email(), "SELLER_STAFF")))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("MEMBER_ROLE_TYPE_MISMATCH"));
		String body = invitation(invitee.email(), "PROVIDER_RECEPTIONIST");
		String created = call(owner, post(org + "/invitations").content(body)).andReturn()
			.getResponse()
			.getContentAsString();
		Integer invitationId = JsonPath.read(created, "$.id");
		String token = lastInvitationToken(invitee.email());

		call(invitee, delete(org + "/invitations/" + invitationId)).andExpect(status().isForbidden());
		call(owner, delete(org + "/invitations/" + invitationId)).andExpect(status().isNoContent());
		call(invitee, post("/organization-invitations/accept").content(tokenBody(token)))
			.andExpect(status().isBadRequest())
			.andExpect(jsonPath("$.code").value("ORGANIZATION_INVITATION_INVALID"));
	}

	private String lastInvitationToken(String email) {
		ArgumentCaptor<MailMessage> mails = ArgumentCaptor.forClass(MailMessage.class);
		verify(mailService, atLeastOnce()).send(mails.capture());
		List<MailMessage> invitations = mails.getAllValues()
			.stream()
			.filter(mail -> mail.template().equals("organization-invitation") && mail.to().equals(email))
			.toList();
		assertThat(invitations).isNotEmpty();
		String link = (String) invitations.getLast().variables().get("link");
		return link.substring(link.indexOf("token=") + "token=".length());
	}

	private String createOrganization(User owner) throws Exception {
		String created = call(owner, post("/organizations").content(GARAGE)).andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return "/organizations/" + JsonPath.read(created, "$.organization.id");
	}

	private static String invitation(String email, String roleKey) {
		return "{\"email\":\"" + email + "\",\"roleKey\":\"" + roleKey + "\"}";
	}

	private static String tokenBody(String token) {
		return "{\"token\":\"" + token + "\"}";
	}

	private static String randomEmail() {
		return UUID.randomUUID() + "@example.com";
	}

	private record User(String email, String token) {
	}

	private ResultActions call(User user, MockHttpServletRequestBuilder request) throws Exception {
		return perform(request.header("Authorization", user.token()));
	}

	private ResultActions perform(MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.contentType(MediaType.APPLICATION_JSON));
	}

	private User registerUser(String email) throws Exception {
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"Secret@1234\",\"fullName\":\"Test User\"}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return new User(email, "Bearer " + JsonPath.read(body, "$.accessToken"));
	}

}
