-- Every user can chat with the AI assistant.
UPDATE auth.roles SET permissions = permissions || '["assistant:use"]'::jsonb WHERE name = 'USER';
