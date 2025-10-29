import { initDB, Database } from '../db/database';
import { TaskService } from './taskService';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
  private db: Database;

  constructor(db: Database, _taskService: TaskService) {
    this.db = db;
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await axios.get(process.env.SYNC_SERVER_URL || 'http://localhost:3001/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async addToSyncQueue(taskId: string, operation: string, taskData: any): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO sync_queue (task_id, operation, task_data, created_at) VALUES (?, ?, ?, ?)`,
      [taskId, operation, JSON.stringify(taskData), now]
    );
  }

  async sync(): Promise<{ success: boolean; synced_items: number; failed_items: number; errors?: any[] }> {
    try {
      const pendingItems = await this.db.all(`SELECT * FROM sync_queue WHERE status='pending' ORDER BY created_at`);

      if (pendingItems.length === 0) {
        return { success: true, synced_items: 0, failed_items: 0 };
      }

      const payload = pendingItems.map(item => ({
        task_id: item.task_id,
        operation: item.operation,
        data: JSON.parse(item.task_data),
      }));

      const response = await axios.post(process.env.SYNC_SERVER_URL || 'http://localhost:3001/sync', {
        items: payload,
      });

      const results = response.data.processed_items || [];
      let syncedCount = 0;
      let failedCount = 0;
      const errors: any[] = [];

      for (const result of results) {
        if (result.status === 'success') {
          await this.db.run(`UPDATE sync_queue SET status='done' WHERE task_id=?`, [result.client_id]);
          await this.db.run(`UPDATE tasks SET sync_status='synced', last_synced_at=? WHERE id=?`, [new Date().toISOString(), result.client_id]);
          syncedCount++;
        } else {
          await this.db.run(`UPDATE sync_queue SET status='failed', retry_attempts=retry_attempts+1 WHERE task_id=?`, [result.client_id]);
          failedCount++;
          errors.push(result);
        }
      }

      return { success: failedCount === 0, synced_items: syncedCount, failed_items: failedCount, errors };
    } catch (error: any) {
      return { success: false, synced_items: 0, failed_items: 1, errors: [{ error: error.message }] };
    }
  }

  static async processSync(batchSize: number = Number(process.env.SYNC_BATCH_SIZE) || 50) {
    const db = await initDB();
    const pending = await db.all(
      `SELECT * FROM sync_queue WHERE status='pending' ORDER BY created_at LIMIT ?`,
      [batchSize]
    );

    let syncedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const item of pending) {
      try {
        const now = new Date().toISOString();

        await db.run(
          `UPDATE tasks SET sync_status='synced', last_synced_at=? WHERE id=?`,
          [now, item.task_id]
        );

        await db.run(`UPDATE sync_queue SET status='done' WHERE id=?`, [item.id]);
        syncedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          task_id: item.task_id,
          operation: item.operation || 'update',
          error: err.message || 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }

    return { syncedCount, failedCount, errors };
  }

  // ✅ Batch sync logic
  static async processBatch(items: any[]) {
    const db = await initDB();
    const results: any[] = [];

    for (const item of items) {
      try {
        const now = new Date().toISOString();
        let server_id = item.task_id || uuidv4();

        if (item.operation === 'create') {
          await db.run(
            `INSERT INTO tasks (id, title, description, completed, created_at, updated_at, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [server_id, item.data.title, item.data.description, 0, now, now, 'synced']
          );
        } else if (item.operation === 'update') {
          await db.run(
            `UPDATE tasks SET title=?, description=?, updated_at=?, sync_status='synced' WHERE id=?`,
            [item.data.title, item.data.description, now, server_id]
          );
        } else if (item.operation === 'delete') {
          await db.run(`DELETE FROM tasks WHERE id=?`, [server_id]);
        }

        results.push({
          client_id: item.task_id,
          server_id,
          status: 'success',
          resolved_data: {
            id: server_id,
            title: item.data.title,
            description: item.data.description,
            completed: item.data.completed || false,
            created_at: now,
            updated_at: now
          }
        });
      } catch (err: any) {
        results.push({
          client_id: item.task_id,
          status: 'failed',
          error: err.message
        });
      }
    }

    return results;
  }
}
