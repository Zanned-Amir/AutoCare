package tn.autocare.assistant.dto;

import java.util.List;

import org.jspecify.annotations.Nullable;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** The conversation lives in the browser: the last messages come with each new one. */
public record SendAssistantMessageRequest(@NotBlank @Size(max = 2000) String message,
		@Nullable @Size(max = 20) List<@Valid AssistantChatMessage> history) {

	public List<AssistantChatMessage> historyOrEmpty() {
		return history == null ? List.of() : history;
	}

}
