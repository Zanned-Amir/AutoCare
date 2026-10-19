-- vehicle_id, service_id, organization_id and service_request_id belong to other modules: no foreign keys.
CREATE TABLE maintenance.records (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vehicle_id         BIGINT        NOT NULL,
    service_id         BIGINT,
    organization_id    BIGINT,
    service_request_id BIGINT        UNIQUE,
    date               DATE          NOT NULL,
    mileage            INTEGER       NOT NULL CHECK (mileage >= 0),
    description        VARCHAR(500)  NOT NULL,
    result             VARCHAR(2000),
    recommendations    VARCHAR(2000),
    source             VARCHAR(20)   NOT NULL CHECK (source IN ('SERVICE_REQUEST', 'MANUAL')),
    created_by         BIGINT        NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_records_vehicle ON maintenance.records (vehicle_id, date DESC, id DESC);
CREATE INDEX ix_records_organization ON maintenance.records (organization_id, date DESC);
