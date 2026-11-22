package tn.autocare.assistant.service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import tn.autocare.assistant.config.AssistantProperties;
import tn.autocare.assistant.dto.AssistantChatMessage;
import tn.autocare.assistant.dto.SendAssistantMessageRequest;

/** HTTP client of ai-service. Only this API knows the internal token. */
@Component
class AssistantClient {

	private final RestClient restClient;

	AssistantClient(RestClient.Builder builder, AssistantProperties properties) {
		SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
		requestFactory.setConnectTimeout(Duration.ofSeconds(5));
		// Longest silence allowed between two pieces of the answer.
		requestFactory.setReadTimeout(Duration.ofSeconds(60));
		this.restClient = builder.baseUrl(properties.url())
			.requestFactory(requestFactory)
			.defaultHeader("X-Internal-Token", properties.internalToken())
			.build();
	}

	/**
	 * Streams the answer: {@code onData} gets the payload of each {@code data:} line,
	 * {@code [DONE]} included.
	 */
	void streamAssistantAnswer(Long userId, SendAssistantMessageRequest request, DataHandler onData) {
		restClient.post()
			.uri("/chat")
			.contentType(MediaType.APPLICATION_JSON)
			.accept(MediaType.TEXT_EVENT_STREAM)
			.body(new ChatRequest(userId, request.message(), request.historyOrEmpty()))
			.exchange((clientRequest, response) -> {
				if (response.getStatusCode().isError()) {
					throw new RestClientException("ai-service answered " + response.getStatusCode());
				}
				try (BufferedReader reader = new BufferedReader(
						new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
					String line;
					while ((line = reader.readLine()) != null) {
						if (line.startsWith("data:")) {
							onData.accept(line.substring(5).strip());
						}
					}
				}
				return null;
			});
	}

	@FunctionalInterface
	interface DataHandler {

		void accept(String data) throws IOException;

	}

	record ChatRequest(Long userId, String message, List<AssistantChatMessage> history) {
	}

}
