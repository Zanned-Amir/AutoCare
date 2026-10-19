-- customer_id, organization_id and assignee_id point to other modules: no foreign keys.
CREATE TABLE helpdesk.tickets (
    id                         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    version                    BIGINT       NOT NULL DEFAULT 0,
    public_id                  VARCHAR(16)  NOT NULL UNIQUE,
    subject                    VARCHAR(160) NOT NULL,
    description                TEXT         NOT NULL,
    status                     VARCHAR(25)  NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED')),
    priority                   VARCHAR(10)  NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    category                   VARCHAR(20)  NOT NULL,
    channel                    VARCHAR(10)  NOT NULL,
    customer_id                BIGINT       NOT NULL,
    organization_id            BIGINT,
    assignee_id                BIGINT,
    reference_type             VARCHAR(30),
    reference_id               VARCHAR(64),
    escalation_level           INTEGER      NOT NULL DEFAULT 0,
    first_response_due_at      TIMESTAMPTZ,
    resolution_due_at          TIMESTAMPTZ,
    sla_paused_at              TIMESTAMPTZ,
    paused_seconds             BIGINT       NOT NULL DEFAULT 0,
    first_response_breached_at TIMESTAMPTZ,
    resolution_breached_at     TIMESTAMPTZ,
    first_response_at          TIMESTAMPTZ,
    last_customer_reply_at     TIMESTAMPTZ,
    last_agent_reply_at        TIMESTAMPTZ,
    resolved_at                TIMESTAMPTZ,
    closed_at                  TIMESTAMPTZ,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_tickets_customer ON helpdesk.tickets (customer_id, updated_at DESC);
CREATE INDEX ix_tickets_organization ON helpdesk.tickets (organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX ix_tickets_queue ON helpdesk.tickets (status, assignee_id, first_response_due_at);

CREATE TABLE helpdesk.ticket_messages (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id   BIGINT      NOT NULL REFERENCES helpdesk.tickets (id) ON DELETE CASCADE,
    author_id   BIGINT,
    author_type VARCHAR(10) NOT NULL CHECK (author_type IN ('CUSTOMER', 'AGENT', 'SYSTEM')),
    body        TEXT        NOT NULL,
    internal    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ticket_messages_ticket ON helpdesk.ticket_messages (ticket_id, created_at);

CREATE TABLE helpdesk.ticket_events (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id  BIGINT      NOT NULL REFERENCES helpdesk.tickets (id) ON DELETE CASCADE,
    actor_id   BIGINT,
    type       VARCHAR(30) NOT NULL,
    data       JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_ticket_events_ticket ON helpdesk.ticket_events (ticket_id, created_at);

CREATE TABLE helpdesk.sla_policies (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    priority               VARCHAR(10) NOT NULL UNIQUE,
    first_response_minutes INTEGER     NOT NULL CHECK (first_response_minutes > 0),
    resolution_minutes     INTEGER     NOT NULL CHECK (resolution_minutes > 0),
    active                 BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Defaults (template: seed:sla-policies). Editable from the backoffice.
INSERT INTO helpdesk.sla_policies (priority, first_response_minutes, resolution_minutes) VALUES
    ('LOW', 1440, 10080),
    ('NORMAL', 480, 4320),
    ('HIGH', 120, 1440),
    ('URGENT', 30, 240);
