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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_installation_app_name ON Installation(app_name);
CREATE INDEX IF NOT EXISTS idx_installation_country_code ON Installation(country_code);
CREATE INDEX IF NOT EXISTS idx_installation_created_at ON Installation(created_at);

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
