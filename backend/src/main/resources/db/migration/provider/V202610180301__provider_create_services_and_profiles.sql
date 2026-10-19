-- organization_id and service_id point to other modules' tables, so there are no foreign keys.
CREATE TABLE provider.provider_services (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id  BIGINT        NOT NULL,
    service_id       BIGINT        NOT NULL,
    at_home          BOOLEAN       NOT NULL DEFAULT FALSE,
    indicative_price NUMERIC(12, 3) CHECK (indicative_price >= 0),
    currency         VARCHAR(3)    NOT NULL DEFAULT 'TND',
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ux_provider_services UNIQUE (organization_id, service_id)
);
CREATE INDEX ix_provider_services_service ON provider.provider_services (service_id, at_home);

-- Copy of organization profiles maintained from OrganizationProfileChanged events.
CREATE TABLE provider.provider_profiles (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id BIGINT        NOT NULL UNIQUE,
    name            VARCHAR(120)  NOT NULL,
    description     VARCHAR(1000),
    phone           VARCHAR(30)   NOT NULL,
    governorate     VARCHAR(40)   NOT NULL,
    city            VARCHAR(80)   NOT NULL,
    address         VARCHAR(255),
    service_zone    VARCHAR(255),
    visible         BOOLEAN       NOT NULL DEFAULT FALSE,
    search_text     TEXT          NOT NULL DEFAULT '',
    search_vector   TSVECTOR GENERATED ALWAYS AS (to_tsvector('simple', search_text)) STORED,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_provider_profiles_search ON provider.provider_profiles USING GIN (search_vector);
CREATE INDEX ix_provider_profiles_visible ON provider.provider_profiles (visible, governorate);
