CREATE TABLE vehicle.vehicles (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id   BIGINT      NOT NULL,
    brand      VARCHAR(60) NOT NULL,
    model      VARCHAR(60) NOT NULL,
    year       INTEGER     NOT NULL CHECK (year >= 1950),
    fuel_type  VARCHAR(20) NOT NULL CHECK (fuel_type IN ('ESSENCE', 'DIESEL', 'HYBRID', 'ELECTRIC', 'LPG')),
    engine     VARCHAR(60),
    mileage    INTEGER     NOT NULL CHECK (mileage >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- owner_id points to auth.users but has no foreign key: modules only share IDs.
CREATE INDEX ix_vehicles_owner ON vehicle.vehicles (owner_id);
