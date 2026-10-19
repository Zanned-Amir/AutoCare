-- The provider's quote on a pending request (one at a time, a new one replaces it).
ALTER TABLE servicerequest.service_requests
    ADD COLUMN quote_amount   NUMERIC(12, 3),
    ADD COLUMN quote_currency VARCHAR(3),
    ADD COLUMN quote_note     VARCHAR(1000),
    ADD COLUMN quote_status   VARCHAR(20) CHECK (quote_status IN ('SENT', 'ACCEPTED', 'DECLINED')),
    ADD COLUMN quoted_at      TIMESTAMPTZ;
