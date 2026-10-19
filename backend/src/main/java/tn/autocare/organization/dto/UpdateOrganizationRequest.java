package tn.autocare.organization.dto;

import java.util.Map;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tn.autocare.organization.entity.OrganizationDetails;

public record UpdateOrganizationRequest(@NotBlank @Size(max = 120) String name, @Size(max = 1000) String description,
		@NotBlank @Size(max = 30) String phone, @NotBlank String governorate, @NotBlank @Size(max = 80) String city,
		@Size(max = 255) String address, @Size(max = 255) String serviceZone, Map<String, String> workingHours,
		Double latitude, Double longitude) {

	public OrganizationDetails toDetails() {
		return new OrganizationDetails(name, description, phone, governorate, city, address, serviceZone, workingHours,
				latitude, longitude);
	}

}
