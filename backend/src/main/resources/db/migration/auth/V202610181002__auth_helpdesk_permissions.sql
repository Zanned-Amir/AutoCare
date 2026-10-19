-- Every user can open and follow their own support tickets.
UPDATE auth.roles SET permissions = permissions || '["ticket:create", "ticket:read"]'::jsonb WHERE name = 'USER';
