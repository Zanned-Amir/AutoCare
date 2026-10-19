package tn.autocare.telegram.api;

/** Implemented by {@code tn.autocare.telegram.service.TelegramFacadeImpl}. */
public interface TelegramFacade {

	boolean isEnabled();

	boolean isLinked(Long userId);

	/**
	 * Sends after the current transaction commits. False when Telegram is off or the user
	 * has no link.
	 */
	boolean sendMessage(Long userId, String text);

}
