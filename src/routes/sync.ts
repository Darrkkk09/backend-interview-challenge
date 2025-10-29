import express, { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/syncService';
import { initDB } from '../db/database';

const router = express.Router();

router.post('/sync', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SyncService.processSync();

    res.status(200).json({
      success: true,
      synced_items: result.syncedCount,
      failed_items: result.failedCount,
      errors: result.errors
    });
  } catch (err) {
    next(err);
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  const db = await initDB();
  const pending = await db.get(`SELECT COUNT(*) as count FROM sync_queue WHERE status='pending'`);
  const lastSync = await db.get(`SELECT MAX(updated_at) as last_sync FROM tasks WHERE sync_status='synced'`);

  res.json({
    pending_sync_count: pending.count,
    last_sync_timestamp: lastSync.last_sync,
    is_online: true,
    sync_queue_size: pending.count
  });
});

router.post('/batch', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await SyncService.processBatch(req.body.items);
    res.status(200).json({ processed_items: result });
  } catch (err) {
    next(err);
  }
});



export default router;
