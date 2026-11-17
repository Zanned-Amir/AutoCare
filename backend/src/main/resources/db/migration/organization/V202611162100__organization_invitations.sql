-- invited_by and accepted_by point to auth.users with no foreign key: modules only share IDs.
CREATE TABLE organization.organization_invitations (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id BIGINT       NOT NULL REFERENCES organization.organizations (id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    role_key        VARCHAR(40)  NOT NULL,
    token_hash      VARCHAR(64)  NOT NULL,
    status          VARCHAR(20)  NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
    invited_by      BIGINT       NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    accepted_by     BIGINT,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_organization_invitations_token UNIQUE (token_hash)
);
CREATE INDEX ix_organization_invitations_organization ON organization.organization_invitations (organization_id, status);
