import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance: SQLiteDatabase | null = null;

export async function initDB(): Promise<SQLiteDatabase> {
  if (dbInstance) return dbInstance;

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

  dbInstance = db;
  return db;
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close();
    dbInstance = null;
  }
}

export class Database {
  private db: SQLiteDatabase;

  constructor() {
    this.db = null as any;
  }

  async initialize(): Promise<void> {
    this.db = await open({
      filename: process.env.DATABASE_URL || ':memory:',
      driver: sqlite3.Database,
    });

    await this.db.exec(`
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

    await this.db.exec(`
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
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    return this.db.all(sql, params);
  }

  async get(sql: string, params?: any[]): Promise<any> {
    return this.db.get(sql, params);
  }

  async run(sql: string, params?: any[]): Promise<any> {
    return this.db.run(sql, params);
  }
}
