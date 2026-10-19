package tn.autocare.auth.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.ConfirmTokenRequest;
import tn.autocare.auth.dto.RequestPasswordResetRequest;
import tn.autocare.auth.dto.ResetPasswordRequest;
import tn.autocare.auth.dto.ResetPasswordWithOtpRequest;
import tn.autocare.auth.dto.SentResponse;
import tn.autocare.auth.service.AccountService;
import tn.autocare.auth.service.EmailVerificationService;
import tn.autocare.auth.service.PasswordResetService;

/**
 * Public account endpoints shared by both modes. Sign-in itself lives in
 * CookieAuthController (/auth/c) and HeaderAuthController (/auth/h).
 */
@Tag(name = "Auth")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

	private final EmailVerificationService emailVerificationService;

	private final PasswordResetService passwordResetService;

	private final AccountService accountService;

	@PostMapping("/email-verification/confirm")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void confirmEmailByLink(@Valid @RequestBody ConfirmTokenRequest request) {
		emailVerificationService.confirmEmailByLink(request.token());
	}

	@PostMapping("/password-reset/request")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public SentResponse requestPasswordReset(@Valid @RequestBody RequestPasswordResetRequest request) {
		return passwordResetService.requestPasswordReset(request.email(), request.channel());
	}

	@PostMapping("/password-reset/confirm")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetPasswordByLink(@Valid @RequestBody ResetPasswordRequest request) {
		passwordResetService.resetPasswordByLink(request.token(), request.newPassword());
	}

	@PostMapping("/password-reset/confirm-otp")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void resetPasswordByOtp(@Valid @RequestBody ResetPasswordWithOtpRequest request) {
		passwordResetService.resetPasswordByOtp(request.email(), request.code(), request.newPassword());
	}

	@PostMapping("/email-change/confirm")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void confirmEmailChange(@Valid @RequestBody ConfirmTokenRequest request) {
		accountService.confirmEmailChange(request.token());
	}

}
