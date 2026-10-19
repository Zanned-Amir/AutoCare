package tn.autocare.shared.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import tn.autocare.shared.exception.AppException;
import tn.autocare.shared.exception.ErrorCode;

/**
 * Every error leaves the API as an RFC 9457 problem detail with a stable {@code code}
 * property.
 */
@Slf4j
@RestControllerAdvice
@RequiredArgsConstructor
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

	private final MessageSource messageSource;

	@ExceptionHandler(AppException.class)
	ProblemDetail handleAppException(AppException ex) {
		ProblemDetail problem = problem(ex.getCode(), ex.getMessage());
		if (ex.getRetryAfterSeconds() != null) {
			problem.setProperty("retryAfter", ex.getRetryAfterSeconds());
		}
		return problem;
	}

	@ExceptionHandler(OptimisticLockingFailureException.class)
	ProblemDetail handleConcurrentUpdate(OptimisticLockingFailureException ex) {
		return problem(ErrorCode.CONFLICT, "Changed by someone else, reload and try again");
	}

	@ExceptionHandler(AccessDeniedException.class)
	ProblemDetail handleAccessDenied(AccessDeniedException ex) {
		return problem(ErrorCode.FORBIDDEN, "You do not have permission to do this");
	}

	@ExceptionHandler(Exception.class)
	ProblemDetail handleUnexpected(Exception ex) {
		log.error("Unhandled exception", ex);
		return problem(ErrorCode.INTERNAL_ERROR, "Unexpected error");
	}

	@Override
	protected @Nullable ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
			.body(problem(ErrorCode.FILE_TOO_LARGE, "File too large"));
	}

	@Override
	protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError error : ex.getBindingResult().getFieldErrors()) {
			errors.putIfAbsent(error.getField(), error.getDefaultMessage());
		}
		ProblemDetail body = problem(ErrorCode.VALIDATION_FAILED, "Request validation failed");
		body.setProperty("errors", errors);
		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	/**
	 * The detail is translated from i18n/messages ("error." + code) in the request
	 * language. The English text passed in is only used when no translation exists.
	 */
	private ProblemDetail problem(ErrorCode code, String fallbackDetail) {
		String detail = messageSource.getMessage("error." + code.name(), null, fallbackDetail,
				LocaleContextHolder.getLocale());
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(code.status(), detail);
		problem.setProperty("code", code.name());
		return problem;
	}

}
