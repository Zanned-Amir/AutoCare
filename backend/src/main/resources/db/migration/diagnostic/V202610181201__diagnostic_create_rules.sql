CREATE TABLE diagnostic.symptoms (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    label       VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    position    INTEGER      NOT NULL DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE diagnostic.questions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symptom_id  BIGINT       NOT NULL REFERENCES diagnostic.symptoms (id) ON DELETE CASCADE,
    text        VARCHAR(300) NOT NULL,
    answer_type VARCHAR(20)  NOT NULL CHECK (answer_type IN ('YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'NUMBER')),
    options     JSONB        NOT NULL DEFAULT '[]',
    position    INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_questions_symptom ON diagnostic.questions (symptom_id, position);

-- conditions: [{"questionId": 1, "operator": "EQUALS", "value": "true"}], all must match.
-- service_id points to catalog.auto_services (no foreign key across modules).
CREATE TABLE diagnostic.rules (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    symptom_id     BIGINT        NOT NULL REFERENCES diagnostic.symptoms (id) ON DELETE CASCADE,
    name           VARCHAR(120)  NOT NULL,
    conditions     JSONB         NOT NULL DEFAULT '[]',
    priority       INTEGER       NOT NULL DEFAULT 0,
    possible_cause VARCHAR(300)  NOT NULL,
    recommendation VARCHAR(1000) NOT NULL,
    service_id     BIGINT,
    urgency        VARCHAR(10)   NOT NULL CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_rules_symptom ON diagnostic.rules (symptom_id, priority DESC);

-- The result is copied so editing a rule later never rewrites a past diagnostic.
CREATE TABLE diagnostic.diagnostics (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT        NOT NULL,
    vehicle_id     BIGINT,
    symptom_id     BIGINT        NOT NULL REFERENCES diagnostic.symptoms (id),
    rule_id        BIGINT        REFERENCES diagnostic.rules (id) ON DELETE SET NULL,
    answers        JSONB         NOT NULL,
    possible_cause VARCHAR(300),
    recommendation VARCHAR(1000),
    service_id     BIGINT,
    urgency        VARCHAR(10),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_diagnostics_user ON diagnostic.diagnostics (user_id, created_at DESC);
