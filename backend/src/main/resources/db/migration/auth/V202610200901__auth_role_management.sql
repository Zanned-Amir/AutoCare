-- Roles become editable from the backoffice. Seeded roles are "system": never deleted or renamed.
ALTER TABLE auth.roles
    ADD COLUMN label  VARCHAR(80),
    ADD COLUMN system BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE auth.roles SET system = TRUE WHERE name IN ('USER', 'ADMIN', 'SUPPORT');
UPDATE auth.roles SET label = 'Client' WHERE name = 'USER';
UPDATE auth.roles SET label = 'Administrateur' WHERE name = 'ADMIN';
UPDATE auth.roles SET label = 'Agent support' WHERE name = 'SUPPORT';
UPDATE auth.roles SET label = name WHERE label IS NULL;

ALTER TABLE auth.roles ALTER COLUMN label SET NOT NULL;
