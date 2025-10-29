import express, { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/syncService';

const router = express.Router();

router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await SyncService.processSync();
    res.status(200).json({ message: 'Sync completed' });
  } catch (err) {
    next(err);
  }
});

export default router;
