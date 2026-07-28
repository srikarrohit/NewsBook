-- Super admin account (has ADMIN privileges across the system)
INSERT INTO users (id, username, password, role, tile_id, created_at, updated_at)
VALUES (1, 'superadmin', 'SuperSecret123!', 'SUPER_ADMIN', NULL, NOW(), NOW());
