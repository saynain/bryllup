ALTER TABLE media ADD COLUMN display_order INTEGER;
ALTER TABLE media ADD COLUMN deleted_at TEXT;
ALTER TABLE media ADD COLUMN status_before_delete TEXT;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      ORDER BY COALESCE(taken_at, uploaded_at, created_at) ASC, created_at ASC, id ASC
    ) - 1) * 10 AS position
  FROM media
)
UPDATE media
SET display_order = (
  SELECT position
  FROM ranked
  WHERE ranked.id = media.id
);

CREATE INDEX IF NOT EXISTS idx_media_display_order
  ON media(display_order ASC, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_media_deleted_at
  ON media(deleted_at);
