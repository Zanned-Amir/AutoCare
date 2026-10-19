-- Upcoming maintenance a client wants to be reminded of, by date and/or mileage.
-- vehicle_id, owner_id and service_id belong to other modules: no foreign keys.
CREATE TABLE maintenance.reminders (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id  BIGINT       NOT NULL,
    owner_id    BIGINT       NOT NULL,
    service_id  BIGINT,
    title       VARCHAR(120) NOT NULL,
    due_date    DATE,
    due_mileage INTEGER CHECK (due_mileage >= 0),
    note        VARCHAR(500),
    done_at     TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CHECK (due_date IS NOT NULL OR due_mileage IS NOT NULL)
);
CREATE INDEX ix_reminders_vehicle ON maintenance.reminders (vehicle_id);
CREATE INDEX ix_reminders_pending ON maintenance.reminders (id) WHERE done_at IS NULL AND notified_at IS NULL;
