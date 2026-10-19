CREATE TABLE auth.auth_tokens (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    type         VARCHAR(30)  NOT NULL CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE')),
    channel      VARCHAR(10)  NOT NULL CHECK (channel IN ('LINK', 'OTP')),
    token_hash   VARCHAR(64)  NOT NULL,
    target_email VARCHAR(254),
    expires_at   TIMESTAMPTZ  NOT NULL,
    used_at      TIMESTAMPTZ,
    attempts     INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_auth_tokens_hash ON auth.auth_tokens (token_hash);
CREATE INDEX ix_auth_tokens_user_type ON auth.auth_tokens (user_id, type) WHERE used_at IS NULL;

-- Sessions: who, from where, since when, and why a token stopped working.
ALTER TABLE auth.refresh_tokens
    ADD COLUMN ip_address         VARCHAR(45),
    ADD COLUMN session_started_at TIMESTAMPTZ,
    ADD COLUMN revoke_reason      VARCHAR(30);
UPDATE auth.refresh_tokens SET session_started_at = created_at;
UPDATE auth.refresh_tokens SET revoke_reason = 'ROTATED' WHERE revoked_at IS NOT NULL;
ALTER TABLE auth.refresh_tokens ALTER COLUMN session_started_at SET NOT NULL;
CREATE INDEX ix_refresh_tokens_user_agent ON auth.refresh_tokens (user_id, user_agent);
