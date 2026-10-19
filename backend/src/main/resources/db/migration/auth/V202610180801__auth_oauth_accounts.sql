CREATE TABLE auth.oauth_accounts (
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    provider            VARCHAR(20)  NOT NULL CHECK (provider IN ('GOOGLE', 'FACEBOOK', 'GITHUB', 'APPLE')),
    provider_account_id VARCHAR(255) NOT NULL,
    provider_email      VARCHAR(254),
    display_name        VARCHAR(120),
    picture_url         VARCHAR(500),
    last_used_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_oauth_provider_account UNIQUE (provider, provider_account_id),
    CONSTRAINT ux_oauth_user_provider UNIQUE (user_id, provider)
);
