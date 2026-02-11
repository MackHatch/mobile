import { openDatabaseSync } from "expo-sqlite";

const DB_NAME = "habit_mood.db";

function addHabitUpdatedAt(): void {
  const db = openDatabaseSync(DB_NAME);
  try {
    db.execSync("ALTER TABLE habits ADD COLUMN updated_at INTEGER");
  } catch (e) {
    if (!String(e).includes("duplicate column")) throw e;
  }
}

const MIGRATIONS: (string | (() => void))[] = [
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    is_archived INTEGER DEFAULT 0,
    updated_at INTEGER,
    synced_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  addHabitUpdatedAt,
  `CREATE TABLE IF NOT EXISTS habit_completions (
    id TEXT PRIMARY KEY,
    habit_id TEXT NOT NULL,
    date TEXT NOT NULL,
    done INTEGER DEFAULT 1,
    synced_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS mood_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    mood INTEGER NOT NULL,
    notes TEXT,
    synced_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `DROP TABLE IF EXISTS outbox;`,
  `CREATE TABLE outbox (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
  )`,
];

export function migrate(): void {
  const db = openDatabaseSync(DB_NAME);
  for (const m of MIGRATIONS) {
    if (typeof m === "string") db.execSync(m);
    else m();
  }
}
