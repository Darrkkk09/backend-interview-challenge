import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import dotenv from 'dotenv';

dotenv.config();

export async function initDB(): Promise<Database> {
  const db = await open({
    filename: process.env.DATABASE_URL || '/tmp/tasks.sqlite3', //render db path 
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

  return db;
}
