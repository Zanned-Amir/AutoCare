package tn.autocare.telegram.service;

import java.util.List;
import java.util.Map;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import tn.autocare.telegram.config.TelegramProperties;
import tn.autocare.telegram.dto.TelegramUpdate;

/** Telegram Bot API over plain HTTP. */
@Component
public class TelegramClient {

	private final RestClient restClient;

	public TelegramClient(RestClient.Builder builder, TelegramProperties telegram) {
		this.restClient = builder.baseUrl("https://api.telegram.org/bot" + telegram.botToken()).build();
	}

	public void sendMessage(String chatId, String text) {
		restClient.post()
			.uri("/sendMessage")
			.body(Map.of("chat_id", chatId, "text", text))
			.retrieve()
			.toBodilessEntity();
	}

	/**
	 * Long polling: waits up to {@code timeoutSeconds} for updates after {@code offset}.
	 */
	public List<TelegramUpdate> getUpdates(long offset, int timeoutSeconds) {
		UpdatesResponse response = restClient.get()
			.uri("/getUpdates?offset={offset}&timeout={timeout}", offset, timeoutSeconds)
			.retrieve()
			.body(new ParameterizedTypeReference<UpdatesResponse>() {
			});
		return response == null || response.result() == null ? List.of() : response.result();
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	record UpdatesResponse(boolean ok, List<TelegramUpdate> result) {
	}

}
