-- Content stored once; one recipient row per user with its own read state.
-- type + params are translated when read (notification.<TYPE>.title in i18n/messages); title/body hold free text.
CREATE TABLE notification.notifications (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id       BIGINT,
    organization_id BIGINT,
    type            VARCHAR(60)   NOT NULL,
    params          JSONB         NOT NULL DEFAULT '[]',
    title           VARCHAR(200),
    body            VARCHAR(1000),
    resource_type   VARCHAR(40),
    resource_id     BIGINT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE notification.recipients (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_id BIGINT      NOT NULL REFERENCES notification.notifications (id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL,
    read_at         TIMESTAMPTZ,
    dismissed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (notification_id, user_id)
);
CREATE INDEX ix_recipients_user ON notification.recipients (user_id, created_at DESC) WHERE dismissed_at IS NULL;
CREATE INDEX ix_recipients_unread ON notification.recipients (user_id) WHERE read_at IS NULL AND dismissed_at IS NULL;
