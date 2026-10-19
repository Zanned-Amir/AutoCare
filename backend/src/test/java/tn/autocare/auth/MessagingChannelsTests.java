package tn.autocare.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.jayway.jsonpath.JsonPath;

import tn.autocare.TestcontainersConfiguration;
import tn.autocare.shared.mail.MailMessage;
import tn.autocare.shared.mail.MailService;
import tn.autocare.shared.sms.SmsMessage;
import tn.autocare.shared.sms.SmsService;
import tn.autocare.telegram.service.TelegramClient;

/**
 * SMS and Telegram integrations (ported from the template's integrations/sms and
 * integrations/telegram).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@TestPropertySource(
		properties = { "autocare.telegram.bot-token=test-token", "autocare.telegram.bot-username=AutoCareBot",
				"autocare.telegram.mode=webhook", "autocare.telegram.webhook-secret=s3cret" })
class MessagingChannelsTests {

	private static final String PASSWORD = "Secret@1234";

	@Autowired
	MockMvc mvc;

	@MockitoBean
	SmsService smsService;

	@MockitoBean
	MailService mailService;

	@MockitoBean
	TelegramClient telegramClient;

	@Test
	void verifiesThePhoneBySmsAndResetsThePasswordBySms() throws Exception {
		User user = register("22 333 444");
		call(user, get("/me")).andExpect(jsonPath("$.phone").value("+21622333444"))
			.andExpect(jsonPath("$.phoneVerified").value(false));

		// Unverified phone: the SMS reset falls back to an e-mail code.
		mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"channel\":\"SMS\"}")).andExpect(status().isAccepted());
		assertThat(lastMail("reset-password").variables()).containsKey("code");

		call(user, post("/me/phone-verification/send")).andExpect(status().isAccepted());
		SmsMessage verification = lastSms();
		assertThat(verification.to()).isEqualTo("+21622333444");
		assertThat(verification.template()).isEqualTo("phone-verification");
		call(user, post("/me/phone-verification/confirm").content("{\"code\":\"" + verification.args().get(0) + "\"}"))
			.andExpect(status().isNoContent());
		call(user, get("/me")).andExpect(jsonPath("$.phoneVerified").value(true));
	}

	@Test
	void smsResetWorksOnceThePhoneIsVerified() throws Exception {
		User user = register("+216 55 111 222");
		call(user, post("/me/phone-verification/send"));
		call(user, post("/me/phone-verification/confirm").content("{\"code\":\"" + lastSms().args().get(0) + "\"}"));

		mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"channel\":\"SMS\"}")).andExpect(status().isAccepted());
		SmsMessage reset = lastSms();
		assertThat(reset.template()).isEqualTo("password-reset");
		mvc.perform(post("/auth/password-reset/confirm-otp").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"code\":\"" + reset.args().get(0)
					+ "\",\"newPassword\":\"BySms@2026\"}"))
			.andExpect(status().isNoContent());

		// A new number must be verified again.
		call(user, patch("/me").content("{\"fullName\":\"Test User\",\"phone\":\"98765432\"}"))
			.andExpect(jsonPath("$.phoneVerified").value(false));
	}

	@Test
	void linksTelegramWithADeepLinkAndSendsResetCodesThere() throws Exception {
		User user = register(null);
		String link = call(user, post("/me/telegram/link")).andExpect(status().isOk())
			.andReturn()
			.getResponse()
			.getContentAsString();
		String url = JsonPath.read(link, "$.url");
		assertThat(url).startsWith("https://t.me/AutoCareBot?start=");
		String code = url.substring(url.indexOf("start=") + 6);

		String update = "{\"update_id\":1,\"message\":{\"chat\":{\"id\":777},\"from\":{\"username\":\"sami\",\"language_code\":\"fr\"},\"text\":\"/start "
				+ code + "\"}}";
		mvc.perform(post("/integrations/telegram/webhook").contentType(MediaType.APPLICATION_JSON)
			.header("X-Telegram-Bot-Api-Secret-Token", "wrong")
			.content(update)).andExpect(status().isUnauthorized());
		mvc.perform(post("/integrations/telegram/webhook").contentType(MediaType.APPLICATION_JSON)
			.header("X-Telegram-Bot-Api-Secret-Token", "s3cret")
			.content(update)).andExpect(status().isOk());
		verify(telegramClient).sendMessage(eq("777"), contains("lié"));
		call(user, get("/me/telegram")).andExpect(jsonPath("$.linked").value(true))
			.andExpect(jsonPath("$.username").value("sami"));

		mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"channel\":\"TELEGRAM\"}")).andExpect(status().isAccepted());
		ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
		verify(telegramClient, timeout(5000).times(2)).sendMessage(eq("777"), text.capture());
		String resetCode = text.getValue().replaceAll("(?s).*: (\\d{6}).*", "$1");
		mvc.perform(post("/auth/password-reset/confirm-otp").contentType(MediaType.APPLICATION_JSON)
			.content("{\"email\":\"" + user.email() + "\",\"code\":\"" + resetCode
					+ "\",\"newPassword\":\"ByTelegram@1\"}"))
			.andExpect(status().isNoContent());

		call(user, org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/me/telegram"))
			.andExpect(status().isNoContent());
		call(user, get("/me/telegram")).andExpect(jsonPath("$.linked").value(false));
	}

	private record User(String email, String token) {
	}

	private User register(String phone) throws Exception {
		String email = UUID.randomUUID() + "@example.com";
		String phoneJson = phone == null ? "" : ",\"phone\":\"" + phone + "\"";
		String body = mvc
			.perform(post("/auth/c/register").contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\",\"fullName\":\"Test User\""
						+ phoneJson + "}"))
			.andExpect(status().isCreated())
			.andReturn()
			.getResponse()
			.getContentAsString();
		return new User(email, "Bearer " + JsonPath.read(body, "$.accessToken"));
	}

	private ResultActions call(User user, MockHttpServletRequestBuilder request) throws Exception {
		return mvc.perform(request.header("Authorization", user.token()).contentType(MediaType.APPLICATION_JSON));
	}

	private SmsMessage lastSms() {
		ArgumentCaptor<SmsMessage> captor = ArgumentCaptor.forClass(SmsMessage.class);
		verify(smsService, atLeastOnce()).send(captor.capture());
		return captor.getValue();
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
