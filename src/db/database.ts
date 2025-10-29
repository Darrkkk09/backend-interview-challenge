import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let dbInstance: SQLiteDatabase | null = null;

export async function initDB(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  // Ensure ./data directory exists
  const dbDir = path.resolve('./data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Use environment variable or default path
  const dbPath = process.env.DATABASE_URL || path.join(dbDir, 'tasks.sqlite3');

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      is_deleted INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      server_id TEXT,
      last_synced_at TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT,
      operation TEXT,
      task_data TEXT,
      retry_attempts INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TEXT
    )
  `);

  dbInstance = db;
  console.log(`✅ Database initialized at: ${dbPath}`);
  return db;
}
