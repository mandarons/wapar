-- ⚠️ DEPRECATED: This file is kept for reference only
-- 
-- DO NOT USE THIS FILE TO CREATE DATABASES!
-- 
-- The authoritative source for database schema is the Drizzle migrations in drizzle/ directory.
-- Migrations are automatically applied during deployment via GitHub Actions and npm run deploy.
--
-- This file was updated to match the final schema after migration 0002, but should not be used
-- for creating new databases. Instead, use:
--   wrangler d1 migrations apply wapar-db [--remote]
--
-- See DEPLOYMENT.md for proper migration workflow.
-- =====================================================================================

-- Installation table
CREATE TABLE IF NOT EXISTS Installation (
  id TEXT PRIMARY KEY,
  app_name TEXT NOT NULL,
  app_version TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  previous_id TEXT,
  data TEXT,
  country_code TEXT,
  region TEXT,
  last_heartbeat_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_installation_app_name ON Installation(app_name);
CREATE INDEX IF NOT EXISTS idx_installation_app_version ON Installation(app_version);
CREATE INDEX IF NOT EXISTS idx_installation_country_code ON Installation(country_code);
CREATE INDEX IF NOT EXISTS idx_installation_created_at ON Installation(created_at);
CREATE INDEX IF NOT EXISTS idx_installation_updated_at ON Installation(updated_at);
CREATE INDEX IF NOT EXISTS idx_installation_previous_id ON Installation(previous_id);
CREATE INDEX IF NOT EXISTS idx_installation_last_heartbeat_at ON Installation(last_heartbeat_at);

-- Heartbeat table
CREATE TABLE IF NOT EXISTS Heartbeat (
  id TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL,
  data TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (installation_id) REFERENCES Installation(id)
);
CREATE INDEX IF NOT EXISTS idx_heartbeat_installation_id ON Heartbeat(installation_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_created_at ON Heartbeat(created_at);
