package tn.autocare.provider.service;

import org.jspecify.annotations.Nullable;

import tn.autocare.provider.entity.ProviderProfile;

/** A search origin: the client's position and an optional radius. */
public record Near(double latitude, double longitude, @Nullable Double radiusKm) {

	private static final double EARTH_RADIUS_KM = 6371;

	/** Great-circle distance, rounded to 0.1 km, same formula as the SQL ordering. */
	public @Nullable Double distanceTo(ProviderProfile profile) {
		if (profile.getLatitude() == null || profile.getLongitude() == null) {
			return null;
		}
		double dLat = Math.toRadians(profile.getLatitude() - latitude);
		double dLng = Math.toRadians(profile.getLongitude() - longitude);
		double a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(Math.toRadians(latitude))
				* Math.cos(Math.toRadians(profile.getLatitude())) * Math.pow(Math.sin(dLng / 2), 2);
		double km = EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
		return Math.round(km * 10) / 10.0;
	}

}
