-- Backoffice (staff) roles may open backoffice sessions; customer roles may not.
ALTER TABLE auth.roles ADD COLUMN backoffice BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE auth.roles SET backoffice = TRUE WHERE name = 'ADMIN';

-- Support agents work the helpdesk from the backoffice.
INSERT INTO auth.roles (name, description, permissions, backoffice) VALUES
    ('SUPPORT', 'Helpdesk agent', '["ticket:*", "user:read"]', TRUE);

ALTER TABLE auth.refresh_tokens
    ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' CHECK (scope IN ('CUSTOMER', 'BACKOFFICE'));
