import { initDB } from '../db/database';

export class SyncService {
  static async processSync(batchSize: number = Number(process.env.SYNC_BATCH_SIZE) || 50): Promise<void> {
    const db = await initDB();
    const pending = await db.all(
      `SELECT * FROM sync_queue WHERE status='pending' ORDER BY created_at LIMIT ?`,
      [batchSize]
    );

    for (const item of pending) {
      try {
        const now = new Date().toISOString();

        await db.run(
          `UPDATE tasks SET sync_status='synced', last_synced_at=? WHERE id=?`,
          [now, item.task_id]
        );

        await db.run(`UPDATE sync_queue SET status='done' WHERE id=?`, [item.id]);

      }
       catch (err: any) {
        console.error("Sync error for item:", item.id, err.message);

        await db.run(
          `UPDATE sync_queue SET retry_attempts=retry_attempts+1 WHERE id=?`,
          [item.id]
        );

        const updated = await db.get(
          `SELECT retry_attempts FROM sync_queue WHERE id=?`,
          [item.id]
        );

        if (updated.retry_attempts >= (Number(process.env.SYNC_RETRY_ATTEMPTS) || 3)) {
          await db.run(`UPDATE sync_queue SET status='failed' WHERE id=?`, [item.id]);
        }
      }
    }
  }
}
