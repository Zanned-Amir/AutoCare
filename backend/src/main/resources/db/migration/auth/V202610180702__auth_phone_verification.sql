ALTER TABLE auth.users
    ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    -- False for accounts created through OAuth until the user sets a password.
    ADD COLUMN password_set   BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE auth.auth_tokens ADD COLUMN target_phone VARCHAR(20);
ALTER TABLE auth.auth_tokens DROP CONSTRAINT auth_tokens_type_check;
ALTER TABLE auth.auth_tokens ADD CONSTRAINT auth_tokens_type_check
    CHECK (type IN ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE', 'PHONE_VERIFICATION'));
