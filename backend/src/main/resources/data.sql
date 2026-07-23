INSERT INTO users (id, username, password, role, tile_id, created_at, updated_at)
VALUES
  (1, 'admin1', '1234', 'ADMIN', 1, NOW(), NOW()),
  (2, 'admin2', 'abcd', 'ADMIN', 2, NOW(), NOW()),
  (3, 'admin3', 'xyz', 'ADMIN', 3, NOW(), NOW()),
  (4, 'user1', 'pass1', 'USER', NULL, NOW(), NOW()),
  (5, 'user2', 'pass2', 'USER', NULL, NOW(), NOW()),
  (6, 'user3', 'pass3', 'USER', NULL, NOW(), NOW());

INSERT INTO tiles (id, tile_id, admin_id, admin_username, name, image, created_at, updated_at)
VALUES
  (1, 'tile_1', 1, 'admin1', 'Tile 1', 'https://via.placeholder.com/150', NOW(), NOW()),
  (2, 'tile_2', 2, 'admin2', 'Tile 2', 'https://via.placeholder.com/150', NOW(), NOW()),
  (3, 'tile_3', 3, 'admin3', 'Tile 3', 'https://via.placeholder.com/150', NOW(), NOW());

-- Super admin account (has ADMIN privileges across the system)
-- Super admin account
INSERT INTO users (id, username, password, role, tile_id, created_at, updated_at)
VALUES (7, 'superadmin', 'SuperSecret123!', 'SUPER_ADMIN', NULL, NOW(), NOW());
