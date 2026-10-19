-- One review per completed request, by the client who made it. IDs point to other modules
-- with no foreign key.
CREATE TABLE review.reviews (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    service_request_id BIGINT        NOT NULL UNIQUE,
    organization_id    BIGINT        NOT NULL,
    user_id            BIGINT        NOT NULL,
    rating             SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment            VARCHAR(1000),
    reply              VARCHAR(1000),
    replied_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX reviews_organization_idx ON review.reviews (organization_id, created_at DESC);
