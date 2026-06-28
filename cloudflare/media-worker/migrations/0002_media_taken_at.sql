ALTER TABLE media ADD COLUMN taken_at TEXT;

CREATE INDEX IF NOT EXISTS idx_media_chronological
  ON media(status, COALESCE(taken_at, uploaded_at, created_at), created_at, id);
