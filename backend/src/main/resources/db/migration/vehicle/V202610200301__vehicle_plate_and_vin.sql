-- Licence plate ("123 TU 4567", "RS 123456") and VIN, both optional, stored upper case.
ALTER TABLE vehicle.vehicles
    ADD COLUMN plate VARCHAR(20),
    ADD COLUMN vin   VARCHAR(17);

CREATE INDEX vehicles_plate_idx ON vehicle.vehicles (plate);
