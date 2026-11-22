package tn.autocare.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** One earlier message of the conversation, sent back so the assistant keeps the context. */
public record AssistantChatMessage(@NotNull @Pattern(regexp = "user|assistant") String role,
		@NotBlank @Size(max = 4000) String content) {
}
