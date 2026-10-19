-- Booking: slot length and how many clients one slot takes (working_hours already exists).
ALTER TABLE organization.organizations
    ADD COLUMN slot_minutes  INT NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 15 AND 240),
    ADD COLUMN slot_capacity INT NOT NULL DEFAULT 1 CHECK (slot_capacity BETWEEN 1 AND 20);
