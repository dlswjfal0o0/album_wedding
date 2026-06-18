-- 가족 앨범 데이터베이스 스키마
-- Cloudflare D1 대시보드의 콘솔(Console) 탭에 이 내용을 붙여넣고 실행하세요.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uploader_id INTEGER NOT NULL,
  uploader_name TEXT NOT NULL,
  r2_key TEXT UNIQUE NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  size_bytes INTEGER NOT NULL,
  upload_id TEXT,
  status TEXT NOT NULL DEFAULT 'uploading',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (uploader_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_files_type ON files(file_type);
CREATE INDEX IF NOT EXISTS idx_files_uploader ON files(uploader_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
