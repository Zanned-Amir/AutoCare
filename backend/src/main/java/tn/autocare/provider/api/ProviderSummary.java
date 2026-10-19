package tn.autocare.provider.api;

import java.util.List;

public record ProviderSummary(Long organizationId, String name, String governorate, String city, String phone,
		List<OfferedService> services) {
}
