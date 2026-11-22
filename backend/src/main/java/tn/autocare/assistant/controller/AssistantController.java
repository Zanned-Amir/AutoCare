package tn.autocare.assistant.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.assistant.api.AssistantPermissions;
import tn.autocare.assistant.dto.SendAssistantMessageRequest;
import tn.autocare.assistant.service.AssistantService;
import tn.autocare.shared.security.CurrentUser;

/**
 * Chat with the AI assistant. The answer is streamed as Server-Sent Events
 * ({@code data: {"delta": "..."}}, then {@code data: [DONE]}), read with fetch() so the
 * Authorization header can be sent.
 */
@Tag(name = "Assistant")
@RestController
@RequestMapping("/assistant")
@RequiredArgsConstructor
public class AssistantController {

	private final AssistantService assistantService;

	@PostMapping("/messages")
	@PreAuthorize("@perm.has('" + AssistantPermissions.ASSISTANT_USE + "')")
	public SseEmitter sendAssistantMessage(@Valid @RequestBody SendAssistantMessageRequest request) {
		return assistantService.sendAssistantMessage(CurrentUser.id(), request);
	}

}
