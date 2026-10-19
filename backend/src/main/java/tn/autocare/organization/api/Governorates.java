package tn.autocare.organization.api;

import java.util.List;
import java.util.Optional;

/** The 24 governorates of Tunisia, as stored in {@code governorate} columns. */
public final class Governorates {

	public static final List<String> ALL = List.of("Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa",
			"Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir",
			"Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan");

	private Governorates() {
	}

	public static boolean isValid(String governorate) {
		return ALL.contains(governorate);
	}

	/**
	 * Centre of each governorate (its capital), used when a business has not placed
	 * itself.
	 */
	public static final List<GovernorateLocation> LOCATIONS = List.of(
			new GovernorateLocation("Ariana", 36.8625, 10.1956), new GovernorateLocation("Béja", 36.7256, 9.1817),
			new GovernorateLocation("Ben Arous", 36.7531, 10.2189), new GovernorateLocation("Bizerte", 37.2744, 9.8739),
			new GovernorateLocation("Gabès", 33.8815, 10.0982), new GovernorateLocation("Gafsa", 34.425, 8.7842),
			new GovernorateLocation("Jendouba", 36.5011, 8.7802), new GovernorateLocation("Kairouan", 35.6781, 10.0963),
			new GovernorateLocation("Kasserine", 35.1676, 8.8365), new GovernorateLocation("Kébili", 33.7044, 8.969),
			new GovernorateLocation("Le Kef", 36.1742, 8.7049), new GovernorateLocation("Mahdia", 35.5047, 11.0622),
			new GovernorateLocation("La Manouba", 36.8101, 10.0956),
			new GovernorateLocation("Médenine", 33.3549, 10.5055),
			new GovernorateLocation("Monastir", 35.7643, 10.8113), new GovernorateLocation("Nabeul", 36.4561, 10.7376),
			new GovernorateLocation("Sfax", 34.7406, 10.7603), new GovernorateLocation("Sidi Bouzid", 35.0382, 9.4849),
			new GovernorateLocation("Siliana", 36.0849, 9.3708), new GovernorateLocation("Sousse", 35.8256, 10.6084),
			new GovernorateLocation("Tataouine", 32.9297, 10.4518), new GovernorateLocation("Tozeur", 33.9197, 8.1335),
			new GovernorateLocation("Tunis", 36.8065, 10.1815), new GovernorateLocation("Zaghouan", 36.4029, 10.1429));

	public static Optional<GovernorateLocation> locate(String governorate) {
		return LOCATIONS.stream().filter(location -> location.name().equals(governorate)).findFirst();
	}

	/**
	 * Rough bounding box of Tunisia, enough to catch a pin dropped in the sea or abroad.
	 */
	public static boolean isInTunisia(double latitude, double longitude) {
		return latitude >= 30.2 && latitude <= 37.6 && longitude >= 7.4 && longitude <= 11.7;
	}

}
