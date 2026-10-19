package tn.autocare.telegram.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import tn.autocare.shared.security.CurrentUser;
import tn.autocare.telegram.dto.TelegramLinkResponse;
import tn.autocare.telegram.dto.TelegramStatusResponse;
import tn.autocare.telegram.service.TelegramLinkService;

@Tag(name = "Me - Telegram")
@RestController
@RequestMapping("/me/telegram")
@RequiredArgsConstructor
public class TelegramController {

	private final TelegramLinkService linkService;

	@GetMapping
	public TelegramStatusResponse getTelegramStatus() {
		return linkService.getTelegramStatus(CurrentUser.id());
	}

	@PostMapping("/link")
	public TelegramLinkResponse createTelegramLink() {
		return linkService.createLinkCode(CurrentUser.id());
	}

	@DeleteMapping
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void unlinkTelegram() {
		linkService.unlinkTelegram(CurrentUser.id());
	}

}
