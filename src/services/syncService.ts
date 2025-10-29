import { initDB } from '../db/database';
import { v4 as uuidv4 } from 'uuid';

export class SyncService {
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

  //  Batch sync logic
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
