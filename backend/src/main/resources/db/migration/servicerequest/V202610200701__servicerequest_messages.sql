-- Chat between the client and the garage on one request.
CREATE TABLE servicerequest.messages (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id BIGINT        NOT NULL REFERENCES servicerequest.service_requests (id) ON DELETE CASCADE,
    author_id          BIGINT        NOT NULL,
    author_side        VARCHAR(10)   NOT NULL CHECK (author_side IN ('CLIENT', 'PROVIDER')),
    body               VARCHAR(2000) NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX ix_messages_request ON servicerequest.messages (service_request_id, id);
