-- Exact point when the business placed itself on the map, else its governorate's centre (approximate_location).
ALTER TABLE provider.provider_profiles
    ADD COLUMN latitude             DOUBLE PRECISION,
    ADD COLUMN longitude            DOUBLE PRECISION,
    ADD COLUMN approximate_location BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX ix_provider_profiles_location ON provider.provider_profiles (latitude, longitude) WHERE visible;
