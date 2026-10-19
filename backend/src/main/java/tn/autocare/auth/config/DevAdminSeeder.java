package tn.autocare.auth.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tn.autocare.auth.api.RoleNames;
import tn.autocare.auth.entity.User;
import tn.autocare.auth.repository.UserRepository;
import tn.autocare.auth.service.AuthService;
import tn.autocare.shared.i18n.SupportedLocales;

/**
 * Creates a verified admin account on dev databases so the backoffice can be used right
 * away.
 */
@Slf4j
@Component
@Profile({ "dev", "test" })
@RequiredArgsConstructor
class DevAdminSeeder implements ApplicationRunner {

	private final UserRepository userRepository;

	private final AuthService authService;

	private final PasswordEncoder passwordEncoder;

	private final DevAdminProperties devAdmin;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		String email = devAdmin.adminEmail();
		if (userRepository.existsByEmailIgnoreCase(email)) {
			return;
		}
		User admin = User.register(email, passwordEncoder.encode(devAdmin.adminPassword()), "Admin AutoCare", null,
				SupportedLocales.FRENCH);
		admin.markEmailVerified();
		admin = userRepository.save(admin);
		authService.assignRole(admin.getId(), RoleNames.USER);
		authService.assignRole(admin.getId(), RoleNames.ADMIN);
		log.info("Seeded dev admin {}", email);
	}

}
