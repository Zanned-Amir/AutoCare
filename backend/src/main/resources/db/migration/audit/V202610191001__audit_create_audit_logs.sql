-- Append-only log of sensitive actions. actor_id and target_id point to other modules with
-- no foreign key: modules only share IDs.
CREATE TABLE audit.audit_logs (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id    BIGINT      NOT NULL,
    action      VARCHAR(60) NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id   BIGINT      NOT NULL,
    details     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_target_idx ON audit.audit_logs (target_type, target_id, created_at DESC);
