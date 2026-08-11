-- Backfill for the publish_at column added alongside scheduled posts. ddl-auto=update
-- does not reliably add new NOT NULL columns to an already-populated table (verified: it
-- silently no-ops), so this idempotent ALTER runs on every startup instead. Existing rows
-- default to "now", i.e. already published, which is correct for posts that predate the
-- publishAt feature.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Super admin account (has ADMIN privileges across the system)
-- Seeds only if missing: this script runs on every startup, and a plain
-- INSERT would fail with a duplicate-key error once the row exists. Using
-- MERGE would instead silently overwrite any password change made later
-- via the app, so this guards on absence instead.
INSERT INTO users (id, username, password, role, tile_id, created_at, updated_at)
SELECT 1, 'superadmin', 'SuperSecret123!', 'SUPER_ADMIN', NULL, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE id = 1);
