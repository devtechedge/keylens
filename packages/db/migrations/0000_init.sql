-- Reference copy of INIT_SQL in src/client.ts. Keep in sync.
CREATE TABLE IF NOT EXISTS orgs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rotation_schedule TEXT DEFAULT 'weekly' NOT NULL,
  auto_rotate_exposed INTEGER DEFAULT 0 NOT NULL,
  notify_channels TEXT DEFAULT '[]' NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  provider TEXT NOT NULL,
  label TEXT,
  fingerprint TEXT NOT NULL,
  masked TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  source_type TEXT DEFAULT 'manual' NOT NULL,
  source_ref TEXT,
  owner_email TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER,
  last_rotated_at INTEGER,
  meta TEXT DEFAULT '{}' NOT NULL
);
CREATE TABLE IF NOT EXISTS usage_points (
  id TEXT PRIMARY KEY,
  key_id TEXT NOT NULL REFERENCES keys(id),
  period_start INTEGER NOT NULL,
  spend_usd_micros INTEGER NOT NULL,
  tokens INTEGER DEFAULT 0 NOT NULL,
  calls INTEGER DEFAULT 0 NOT NULL,
  errors INTEGER DEFAULT 0 NOT NULL,
  region TEXT
);
CREATE TABLE IF NOT EXISTS anomalies (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  key_id TEXT REFERENCES keys(id),
  kind TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  detected_at INTEGER NOT NULL,
  resolved_at INTEGER,
  meta TEXT DEFAULT '{}' NOT NULL
);
CREATE TABLE IF NOT EXISTS rotation_jobs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id),
  key_id TEXT NOT NULL REFERENCES keys(id),
  provider TEXT NOT NULL,
  status TEXT DEFAULT 'queued' NOT NULL,
  scheduled_for INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  result TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS orgs_created_at_idx ON orgs (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS keys_fingerprint_idx ON keys (fingerprint);
CREATE INDEX IF NOT EXISTS keys_org_idx ON keys (org_id);
CREATE INDEX IF NOT EXISTS keys_status_idx ON keys (status);
CREATE INDEX IF NOT EXISTS usage_key_period_idx ON usage_points (key_id, period_start);
CREATE INDEX IF NOT EXISTS anomalies_org_detected_idx ON anomalies (org_id, detected_at);
CREATE INDEX IF NOT EXISTS anomalies_key_idx ON anomalies (key_id);
CREATE INDEX IF NOT EXISTS rotation_org_sched_idx ON rotation_jobs (org_id, scheduled_for);
CREATE INDEX IF NOT EXISTS rotation_key_idx ON rotation_jobs (key_id);
