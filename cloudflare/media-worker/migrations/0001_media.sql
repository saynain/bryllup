CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  media_type TEXT NOT NULL,
  status TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT,
  object_key TEXT,
  provider_id TEXT,
  url TEXT,
  thumbnail_url TEXT,
  created_at TEXT NOT NULL,
  uploaded_at TEXT,
  updated_at TEXT NOT NULL,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_status ON media(status);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
