import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dataDir = path.resolve(process.cwd(), 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'app.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE,
  session_key TEXT UNIQUE,
  encrypted_token TEXT NOT NULL,
  token_note TEXT,
  last_validated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

const tokenColumns = db.prepare(`PRAGMA table_info(user_tokens)`).all();
const hasSessionKey = tokenColumns.some((col) => col.name === 'session_key');
const userIdCol = tokenColumns.find((col) => col.name === 'user_id');
const userIdIsNotNull = Boolean(userIdCol?.notnull);

if (userIdIsNotNull) {
  db.exec(`
  CREATE TABLE IF NOT EXISTS user_tokens_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    session_key TEXT UNIQUE,
    encrypted_token TEXT NOT NULL,
    token_note TEXT,
    last_validated_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  INSERT INTO user_tokens_new (
    id, user_id, encrypted_token, token_note, last_validated_at, created_at, updated_at
  )
  SELECT
    id, user_id, encrypted_token, token_note, last_validated_at, created_at, updated_at
  FROM user_tokens;

  DROP TABLE user_tokens;
  ALTER TABLE user_tokens_new RENAME TO user_tokens;
  `);
}

if (!hasSessionKey) {
  db.exec(`ALTER TABLE user_tokens ADD COLUMN session_key TEXT`);
}

db.exec(`
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tokens_session_key ON user_tokens(session_key) WHERE session_key IS NOT NULL;
`);
