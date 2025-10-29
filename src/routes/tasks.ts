import express, { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/taskService';

const router = express.Router();

// GET all tasks
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const tasks = await TaskService.getAllTasks();
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

// GET task by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await TaskService.getTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

// POST create task
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await TaskService.createTask(req.body);
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});

// PUT update task
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const updated = await TaskService.updateTask(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE tasks
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const success = await TaskService.deleteTask(req.params.id);
    if (!success) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.status(204).json({
      "message": 'Task deleted successfully',
      "check_db" : "http://localhost:3000/api/tasks/"
    })
  } catch (err) {
    next(err);
  }
});

export default router;
