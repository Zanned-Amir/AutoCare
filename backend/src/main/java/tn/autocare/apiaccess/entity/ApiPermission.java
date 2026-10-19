package tn.autocare.apiaccess.entity;

import java.util.Arrays;
import java.util.Optional;

/** What a partner key can be allowed to do on /external/v1. */
public enum ApiPermission {

	STATUS_READ("status:read", "Lire l’état du service et de la clé"),
	CATALOG_READ("catalog:read", "Lire le catalogue des services auto"),
	PROVIDERS_READ("providers:read", "Rechercher les prestataires validés et leurs tarifs");

	private final String value;

	private final String description;

	ApiPermission(String value, String description) {
		this.value = value;
		this.description = description;
	}

	public String value() {
		return value;
	}

	public String description() {
		return description;
	}

	public static Optional<ApiPermission> fromValue(String value) {
		return Arrays.stream(values()).filter(p -> p.value.equals(value)).findFirst();
	}

}
