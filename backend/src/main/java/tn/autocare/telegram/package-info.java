/**
 * Telegram bot (template: integrations/telegram). Users link their chat with a deep link
 * (t.me/bot?start=code); other modules then send them messages (password-reset codes)
 * through TelegramFacade. Updates arrive by long polling (dev) or webhook (prod).
 */
@ApplicationModule(displayName = "Telegram")
package tn.autocare.telegram;

import org.springframework.modulith.ApplicationModule;
