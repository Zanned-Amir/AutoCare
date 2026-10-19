-- Platform roles from docs/MODULES.md section 2. MODERATOR comes with the marketplace (V2).
INSERT INTO auth.roles (name, description, permissions) VALUES
    ('USER', 'Every registered person',
     '["vehicle:*", "diagnostic:use", "request:create", "request:read", "request:cancel", "review:create", "subscription:manage", "history:read", "notification:read", "organization:create"]'),
    ('ADMIN', 'Platform administrator', '["*:*"]');
