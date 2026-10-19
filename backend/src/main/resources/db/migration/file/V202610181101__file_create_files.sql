CREATE TABLE file.files (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    storage_key   VARCHAR(255) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    content_type  VARCHAR(100) NOT NULL,
    size_bytes    BIGINT       NOT NULL CHECK (size_bytes > 0),
    owner_type    VARCHAR(30)  NOT NULL CHECK (owner_type IN ('USER', 'ORGANIZATION', 'VEHICLE', 'SERVICE_REQUEST', 'LISTING')),
    owner_id      BIGINT       NOT NULL,
    purpose       VARCHAR(20)  NOT NULL CHECK (purpose IN ('AVATAR', 'LOGO', 'PHOTO', 'DOCUMENT')),
    position      INTEGER      NOT NULL DEFAULT 0,
    uploaded_by   BIGINT       NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- owner_id points to the owner module's table (no foreign key across modules).
CREATE INDEX ix_files_owner ON file.files (owner_type, owner_id, purpose, position);
