package tn.autocare.auth.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import tn.autocare.auth.dto.ChangePasswordRequest;
import tn.autocare.auth.dto.FinishOnboardingRequest;
import tn.autocare.auth.dto.ConfirmOtpRequest;
import tn.autocare.auth.dto.DeactivateAccountRequest;
import tn.autocare.auth.dto.MeResponse;
import tn.autocare.auth.dto.RequestEmailChangeRequest;
import tn.autocare.auth.dto.SendEmailVerificationRequest;
import tn.autocare.auth.dto.SentResponse;
import tn.autocare.auth.dto.SessionResponse;
import tn.autocare.auth.dto.UpdateProfileRequest;
import tn.autocare.auth.entity.SessionScope;
import tn.autocare.auth.service.AccountService;
import tn.autocare.auth.service.AuthService;
import tn.autocare.auth.service.EmailVerificationService;
import tn.autocare.auth.service.PhoneVerificationService;
import tn.autocare.auth.service.SessionService;
import tn.autocare.auth.service.UserService;
import tn.autocare.file.api.FileFacade;
import tn.autocare.file.api.FileOwnerType;
import tn.autocare.file.api.FilePurpose;
import tn.autocare.file.api.StoredFileDto;
import tn.autocare.file.api.UploadFileCommand;
import tn.autocare.shared.security.CurrentUser;

/** The signed-in user's own account (access token required). */
@Tag(name = "Me")
@RestController
@RequestMapping("/me")
@RequiredArgsConstructor
public class MeController {

	private final UserService userService;

	private final AccountService accountService;

	private final EmailVerificationService emailVerificationService;

	private final SessionService sessionService;

	private final PhoneVerificationService phoneVerificationService;

	private final AuthService authService;

	private final RefreshCookie refreshCookie;

	private final FileFacade fileFacade;

	@GetMapping
	public MeResponse getMe() {
		return userService.getMe(CurrentUser.id());
	}

	@PatchMapping
	public MeResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
		return accountService.updateProfile(CurrentUser.id(), request);
	}

	/** Ends the welcome flow after sign-up so it is not offered again. */
	@PostMapping("/onboarding")
	public MeResponse finishOnboarding(@RequestBody FinishOnboardingRequest request) {
		return accountService.finishOnboarding(CurrentUser.id(), request);
	}

	@PostMapping("/password")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
		accountService.changePassword(CurrentUser.id(), CurrentUser.findSessionId().orElse(null), request);
	}

	@PostMapping("/email-change")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public SentResponse requestEmailChange(@Valid @RequestBody RequestEmailChangeRequest request) {
		return accountService.requestEmailChange(CurrentUser.id(), request);
	}

	@PostMapping("/email-verification/send")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public SentResponse sendEmailVerification(@RequestBody(required = false) SendEmailVerificationRequest request) {
		return emailVerificationService.sendEmailVerification(CurrentUser.id(),
				request == null ? null : request.channel());
	}

	@PostMapping("/email-verification/confirm-otp")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void confirmEmailByOtp(@Valid @RequestBody ConfirmOtpRequest request) {
		emailVerificationService.confirmEmailByOtp(CurrentUser.id(), request.code());
	}

	@PostMapping("/phone-verification/send")
	@ResponseStatus(HttpStatus.ACCEPTED)
	public SentResponse sendPhoneVerification() {
		return phoneVerificationService.sendPhoneVerification(CurrentUser.id());
	}

	@PostMapping("/phone-verification/confirm")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void confirmPhone(@Valid @RequestBody ConfirmOtpRequest request) {
		phoneVerificationService.confirmPhone(CurrentUser.id(), request.code());
	}

	@GetMapping("/sessions")
	public List<SessionResponse> listSessions() {
		return sessionService.listSessions(CurrentUser.id(), CurrentUser.findSessionId().orElse(null));
	}

	@DeleteMapping("/sessions/{sessionId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void revokeSession(@PathVariable Long sessionId) {
		sessionService.revokeSession(CurrentUser.id(), sessionId);
	}

	/** Signs out every other device; this one stays signed in. */
	@DeleteMapping("/sessions")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void revokeOtherSessions() {
		sessionService.revokeOtherSessions(CurrentUser.id(), CurrentUser.findSessionId().orElse(null));
	}

	/** Signs out every device, this one included. */
	@PostMapping("/logout-all")
	public ResponseEntity<Void> logoutUserEverywhere(HttpServletRequest http) {
		authService.logoutUserEverywhere(CurrentUser.id());
		return ResponseEntity.noContent()
			.header(HttpHeaders.SET_COOKIE, refreshCookie.clear(SessionScope.CUSTOMER, http).toString())
			.header(HttpHeaders.SET_COOKIE, refreshCookie.clear(SessionScope.BACKOFFICE, http).toString())
			.build();
	}

	@PostMapping("/deactivate")
	public ResponseEntity<Void> deactivateAccount(@Valid @RequestBody DeactivateAccountRequest request,
			HttpServletRequest http) {
		accountService.deactivateAccount(CurrentUser.id(), request.currentPassword());
		return ResponseEntity.noContent()
			.header(HttpHeaders.SET_COOKIE, refreshCookie.clear(SessionScope.CUSTOMER, http).toString())
			.header(HttpHeaders.SET_COOKIE, refreshCookie.clear(SessionScope.BACKOFFICE, http).toString())
			.build();
	}

	/** The profile picture; 204 when there is none. */
	@GetMapping("/avatar")
	public ResponseEntity<StoredFileDto> getMyAvatar() {
		return fileFacade.listOwnerFiles(FileOwnerType.USER, CurrentUser.id(), FilePurpose.AVATAR)
			.stream()
			.findFirst()
			.map(ResponseEntity::ok)
			.orElseGet(() -> ResponseEntity.noContent().build());
	}

	@PutMapping(path = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public StoredFileDto uploadMyAvatar(@RequestParam MultipartFile file) throws IOException {
		Long userId = CurrentUser.id();
		return fileFacade
			.uploadFile(UploadFileCommand.of(file, FileOwnerType.USER, userId, FilePurpose.AVATAR, userId));
	}

	@DeleteMapping("/avatar")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteMyAvatar() {
		Long userId = CurrentUser.id();
		fileFacade.listOwnerFiles(FileOwnerType.USER, userId, FilePurpose.AVATAR)
			.forEach(file -> fileFacade.deleteOwnerFile(FileOwnerType.USER, userId, file.id()));
	}

}
