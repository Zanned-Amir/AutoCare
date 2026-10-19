-- Profiles synced before locations existed: use their governorate's centre (same list as Governorates.LOCATIONS).
-- Exact points arrive with the next OrganizationProfileChanged once the business places itself on the map.
UPDATE provider.provider_profiles p
SET latitude = c.lat, longitude = c.lng, approximate_location = TRUE
FROM (VALUES
    ('Ariana', 36.8625, 10.1956), ('Béja', 36.7256, 9.1817), ('Ben Arous', 36.7531, 10.2189),
    ('Bizerte', 37.2744, 9.8739), ('Gabès', 33.8815, 10.0982), ('Gafsa', 34.425, 8.7842),
    ('Jendouba', 36.5011, 8.7802), ('Kairouan', 35.6781, 10.0963), ('Kasserine', 35.1676, 8.8365),
    ('Kébili', 33.7044, 8.969), ('Le Kef', 36.1742, 8.7049), ('Mahdia', 35.5047, 11.0622),
    ('La Manouba', 36.8101, 10.0956), ('Médenine', 33.3549, 10.5055), ('Monastir', 35.7643, 10.8113),
    ('Nabeul', 36.4561, 10.7376), ('Sfax', 34.7406, 10.7603), ('Sidi Bouzid', 35.0382, 9.4849),
    ('Siliana', 36.0849, 9.3708), ('Sousse', 35.8256, 10.6084), ('Tataouine', 32.9297, 10.4518),
    ('Tozeur', 33.9197, 8.1335), ('Tunis', 36.8065, 10.1815), ('Zaghouan', 36.4029, 10.1429)
) AS c(name, lat, lng)
WHERE p.latitude IS NULL AND p.governorate = c.name;
