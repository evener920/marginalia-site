-- Marginalia comments / likes — D1 schema (兼容原 FastAPI comments-server)
CREATE TABLE IF NOT EXISTS likes (
  slug    TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  ts      INTEGER NOT NULL,
  PRIMARY KEY (slug, ip_hash)
);

CREATE TABLE IF NOT EXISTS comments (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  slug    TEXT NOT NULL,
  title   TEXT NOT NULL DEFAULT '',
  url     TEXT NOT NULL DEFAULT '',
  name    TEXT NOT NULL DEFAULT '',
  body    TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  ts      INTEGER NOT NULL,
  hidden  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug, hidden, id);
CREATE INDEX IF NOT EXISTS idx_comments_recent ON comments(hidden, id);
