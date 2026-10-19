package tn.autocare.maintenance.service;

import java.time.LocalDate;
import java.time.ZoneId;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Every morning at 08:00 (Tunis) and one hour after start-up: tells owners about
 * reminders that became due. A reminder is notified once, so a second instance running
 * the same check sends nothing new once the first one committed.
 */
@Slf4j
@Component
@RequiredArgsConstructor
class MaintenanceReminderScheduler {

	private static final ZoneId TUNIS = ZoneId.of("Africa/Tunis");

	private final MaintenanceReminderService reminderService;

	@Scheduled(cron = "0 0 8 * * *", zone = "Africa/Tunis")
	void notifyDueRemindersEveryMorning() {
		run();
	}

	@Scheduled(initialDelay = 3_600_000, fixedDelay = Long.MAX_VALUE)
	void notifyDueRemindersAfterStartup() {
		run();
	}

	private void run() {
		int sent = reminderService.notifyDueReminders(LocalDate.now(TUNIS));
		if (sent > 0) {
			log.info("Sent {} maintenance reminder(s)", sent);
		}
	}

}
