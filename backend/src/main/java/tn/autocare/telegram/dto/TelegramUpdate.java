package tn.autocare.telegram.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/** The part of a Telegram Bot API update we use. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TelegramUpdate(@JsonProperty("update_id") long updateId, Message message) {

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Message(Chat chat, From from, String text) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Chat(long id) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record From(String username, @JsonProperty("language_code") String languageCode) {
	}

}
