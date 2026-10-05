CREATE TABLE api_cache (
  key TEXT PRIMARY KEY,
  body TEXT,
  stored_at INTEGER NOT NULL DEFAULT 0,
  fresh_until INTEGER NOT NULL DEFAULT 0,
  stale_until INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE repo_catalog (
  name TEXT PRIMARY KEY COLLATE NOCASE,
  metadata TEXT NOT NULL CHECK (json_valid(metadata)),
  updated_at INTEGER NOT NULL
) STRICT;

CREATE TABLE repo_open_daily (
  day TEXT NOT NULL,
  repo TEXT NOT NULL COLLATE NOCASE REFERENCES repo_catalog(name),
  opens INTEGER NOT NULL DEFAULT 1 CHECK (opens > 0),
  PRIMARY KEY (day, repo)
) STRICT;

CREATE TABLE request_budgets (
  key TEXT PRIMARY KEY,
  used INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
) STRICT;

CREATE TABLE upstream_cooldowns (
  service TEXT PRIMARY KEY,
  until_at INTEGER NOT NULL
) STRICT;
