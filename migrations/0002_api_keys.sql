-- 0002_api_keys.sql
-- API key authentication table for route handlers.

CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
