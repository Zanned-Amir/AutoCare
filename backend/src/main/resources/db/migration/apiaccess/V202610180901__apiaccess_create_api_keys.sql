CREATE TABLE apiaccess.api_keys (
    id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key_id                     VARCHAR(32)  NOT NULL UNIQUE,
    secret_hash                VARCHAR(64)  NOT NULL,
    display_prefix             VARCHAR(48)  NOT NULL,
    label                      VARCHAR(120) NOT NULL,
    environment                VARCHAR(10)  NOT NULL CHECK (environment IN ('LIVE', 'TEST')),
    permissions                JSONB        NOT NULL DEFAULT '[]',
    status                     VARCHAR(10)  NOT NULL CHECK (status IN ('ACTIVE', 'DISABLED', 'REVOKED')),
    expires_at                 TIMESTAMPTZ,
    allowed_ips                JSONB        NOT NULL DEFAULT '[]',
    rate_limit_per_minute      INTEGER      NOT NULL CHECK (rate_limit_per_minute > 0),
    last_used_at               TIMESTAMPTZ,
    last_used_ip               VARCHAR(45),
    previous_secret_hash       VARCHAR(64),
    previous_secret_expires_at TIMESTAMPTZ,
    created_by                 BIGINT,
    revoked_at                 TIMESTAMPTZ,
    revoked_reason             VARCHAR(255),
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE apiaccess.api_key_usage (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    api_key_id BIGINT      NOT NULL REFERENCES apiaccess.api_keys (id) ON DELETE CASCADE,
    day        DATE        NOT NULL,
    requests   BIGINT      NOT NULL DEFAULT 0,
    rejected   BIGINT      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_api_key_usage_day UNIQUE (api_key_id, day)
);
