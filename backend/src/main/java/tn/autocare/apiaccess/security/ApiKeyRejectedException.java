package tn.autocare.apiaccess.security;

import tn.autocare.shared.exception.ErrorCode;

/** Why a call to /external/** was refused before reaching a controller. */
class ApiKeyRejectedException extends RuntimeException {

	private final ErrorCode code;

	private final Long apiKeyId;

	private final long retryAfterSeconds;

	ApiKeyRejectedException(ErrorCode code, Long apiKeyId, long retryAfterSeconds) {
		super(code.name());
		this.code = code;
		this.apiKeyId = apiKeyId;
		this.retryAfterSeconds = retryAfterSeconds;
	}

	ErrorCode code() {
		return code;
	}

	Long apiKeyId() {
		return apiKeyId;
	}

	long retryAfterSeconds() {
		return retryAfterSeconds;
	}

}
