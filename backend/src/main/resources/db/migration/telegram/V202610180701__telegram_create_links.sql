-- user_id points to auth.users with no foreign key: modules only share IDs.
CREATE TABLE telegram.telegram_links (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT      NOT NULL UNIQUE,
    chat_id    VARCHAR(32) NOT NULL UNIQUE,
    username   VARCHAR(64),
    linked_at  TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
