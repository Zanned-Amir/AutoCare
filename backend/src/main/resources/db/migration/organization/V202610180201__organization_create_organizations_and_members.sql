CREATE TABLE organization.organizations (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    type          VARCHAR(20)   NOT NULL CHECK (type IN ('PROVIDER', 'SELLER')),
    status        VARCHAR(20)   NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'SUSPENDED')),
    owner_id      BIGINT        NOT NULL,
    description   VARCHAR(1000),
    phone         VARCHAR(30)   NOT NULL,
    governorate   VARCHAR(40)   NOT NULL,
    city          VARCHAR(80)   NOT NULL,
    address       VARCHAR(255),
    service_zone  VARCHAR(255),
    working_hours JSONB         NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_organizations_status ON organization.organizations (status);
CREATE INDEX ix_organizations_owner ON organization.organizations (owner_id);

-- user_id points to auth.users with no foreign key: modules only share IDs.
CREATE TABLE organization.organization_members (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id BIGINT      NOT NULL REFERENCES organization.organizations (id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL,
    status          VARCHAR(20) NOT NULL CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED')),
    role_key        VARCHAR(40) NOT NULL,
    permissions     JSONB       NOT NULL DEFAULT '[]',
    joined_at       TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ux_organization_members UNIQUE (organization_id, user_id)
);
CREATE INDEX ix_organization_members_user ON organization.organization_members (user_id);
