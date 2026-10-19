package tn.autocare;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

/**
 * Fails the build when a module reaches into another module's internals.
 */
class ModularityTests {

	private final ApplicationModules modules = ApplicationModules.of(AutocareApiApplication.class);

	@Test
	void verifiesModuleBoundaries() {
		modules.verify();
	}

	@Test
	void writesModuleDocumentation() {
		new Documenter(modules).writeModulesAsPlantUml().writeIndividualModulesAsPlantUml();
	}

}
