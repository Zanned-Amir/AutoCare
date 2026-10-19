package tn.autocare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.modulith.Modulithic;

@Modulithic(sharedModules = "shared")
@SpringBootApplication
@ConfigurationPropertiesScan
public class AutocareApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(AutocareApiApplication.class, args);
	}

}
