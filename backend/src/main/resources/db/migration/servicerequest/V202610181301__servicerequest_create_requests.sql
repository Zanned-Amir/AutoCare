-- user_id, vehicle_id, service_id, organization_id and diagnostic_id belong to other modules: no foreign keys.
CREATE TABLE servicerequest.service_requests (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    vehicle_id          BIGINT       NOT NULL,
    service_id          BIGINT       NOT NULL,
    organization_id     BIGINT       NOT NULL,
    diagnostic_id       BIGINT,
    desired_date        DATE         NOT NULL,
    location_type       VARCHAR(20)  NOT NULL CHECK (location_type IN ('HOME', 'AT_PROVIDER')),
    location            VARCHAR(300),
    note                VARCHAR(1000),
    rejection_reason    VARCHAR(500),
    cancellation_reason VARCHAR(500),
    status              VARCHAR(20)  NOT NULL
        CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    completed_at        TIMESTAMPTZ,
    version             BIGINT       NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_service_requests_user ON servicerequest.service_requests (user_id, created_at DESC);
CREATE INDEX ix_service_requests_organization ON servicerequest.service_requests (organization_id, status, created_at DESC);

CREATE TABLE servicerequest.status_history (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id BIGINT      NOT NULL REFERENCES servicerequest.service_requests (id) ON DELETE CASCADE,
    from_status        VARCHAR(20),
    to_status          VARCHAR(20) NOT NULL,
    changed_by         BIGINT      NOT NULL,
    note               VARCHAR(500),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_status_history_request ON servicerequest.status_history (service_request_id, id);
