package tn.autocare.shared.exception;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {

	private final ErrorCode code;

	public AppException(ErrorCode code, String message) {
		super(message);
		this.code = code;
	}

	/**
	 * Too many requests: the client may retry after this many seconds (sent as the
	 * retryAfter property).
	 */
	public static AppException tooSoon(ErrorCode code, String message, long retryAfterSeconds) {
		AppException exception = new AppException(code, message);
		exception.retryAfterSeconds = retryAfterSeconds;
		return exception;
	}

	/** Set by tooSoon(); read through the class-level @Getter. */
	private Long retryAfterSeconds;

	public static AppException notFound(String resource, Object id) {
		return new AppException(ErrorCode.RESOURCE_NOT_FOUND, resource + " " + id + " not found");
	}

}
