CREATE TABLE IF NOT EXISTS stream_migrations (
  media_id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL UNIQUE,
  source_provider TEXT NOT NULL,
  source_object_key TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (media_id) REFERENCES media(id)
);

CREATE INDEX IF NOT EXISTS idx_stream_migrations_status
  ON stream_migrations(status, updated_at);
