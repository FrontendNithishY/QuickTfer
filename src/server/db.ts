import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const dataDir = isVercel ? path.join("/tmp", "data") : path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "quicktrfr.sqlite");
export const db = new DatabaseSync(dbPath);

// Enable WAL mode & foreign keys for high performance and integrity
try {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
} catch (e) {
  console.warn("[Database] PRAGMA notice:", e);
}

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pastes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT NOT NULL,
      is_encrypted INTEGER NOT NULL DEFAULT 0,
      iv TEXT,
      auth_tag TEXT,
      salt TEXT,
      password_hash TEXT,
      visibility TEXT NOT NULL DEFAULT 'public',
      expires_at INTEGER,
      burn_after_reading INTEGER NOT NULL DEFAULT 0,
      view_count INTEGER NOT NULL DEFAULT 0,
      show_view_count INTEGER NOT NULL DEFAULT 1,
      allow_comments INTEGER NOT NULL DEFAULT 1,
      user_id INTEGER,
      edit_token TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pastes_slug ON pastes(slug);
    CREATE INDEX IF NOT EXISTS idx_pastes_user_id ON pastes(user_id);
    CREATE INDEX IF NOT EXISTS idx_pastes_created_at ON pastes(created_at);

    CREATE TABLE IF NOT EXISTS quick_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paste_id INTEGER NOT NULL,
      code TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (paste_id) REFERENCES pastes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_quick_shares_code ON quick_shares(code);

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paste_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (paste_id) REFERENCES pastes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paste_id INTEGER NOT NULL,
      tag TEXT NOT NULL,
      FOREIGN KEY (paste_id) REFERENCES pastes(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);
  `);

  console.log("[Database] Initialized successfully with WAL mode.");
}

initDatabase();
