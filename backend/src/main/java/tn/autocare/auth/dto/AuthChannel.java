package tn.autocare.auth.dto;

/**
 * How a one-time token reaches the user. LINK (default): a link by e-mail. OTP: a 6-digit
 * code by e-mail. SMS / TELEGRAM: the code by SMS to the verified phone or to the linked
 * Telegram chat (falls back to e-mail when that is not available).
 */
public enum AuthChannel {

	LINK, OTP, SMS, TELEGRAM

}
