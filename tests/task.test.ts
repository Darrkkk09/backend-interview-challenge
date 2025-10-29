import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initDB } from '../src/db/database';
import { TaskService } from '../src/services/taskService';
import { Task } from '../src/types';

describe('TaskService', () => {
  let db: any;

  beforeEach(async () => {
    process.env.DATABASE_URL = ':memory:';
    db = await initDB();
  });

  afterEach(async () => {
    // Do not close the db here as it's shared
  });

  const createTaskService = () => new TaskService();

  describe('createTask', () => {
    it('should create a new task with default values', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
      };

      const task = await TaskService.createTask(taskData);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.description).toBe('Test Description');
      expect(task.completed).toBe(0);
      expect(task.is_deleted).toBe(0);
      expect(task.sync_status).toBe('pending');
    });

    it('should add task to sync queue after creation', async () => {
      const taskData = {
        title: 'Test Task',
      };

      const task = await TaskService.createTask(taskData);

      // Check if task was added to sync queue
      const syncQueue = await db.all('SELECT * FROM sync_queue WHERE task_id = ?', [task.id]);
      expect(syncQueue.length).toBe(1);
      expect(syncQueue[0].operation).toBe('create');
    });
  });

  describe('updateTask', () => {
    it('should update an existing task', async () => {
      // First create a task
      const task = await TaskService.createTask({ title: 'Original Title' });

      // Update the task
      const updated = await TaskService.updateTask(task.id, {
        title: 'Updated Title',
        completed: true,
      });

      expect(updated).toBeDefined();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.completed).toBe(true);
      expect(updated?.sync_status).toBe('pending');
    });

    it('should return null for non-existent task', async () => {
      const result = await TaskService.updateTask('non-existent-id', { title: 'Test' });
      expect(result).toBeNull();
    });
  });

  describe('deleteTask', () => {
    it('should soft delete a task', async () => {
      const task = await TaskService.createTask({ title: 'To Delete' });

      const result = await TaskService.deleteTask(task.id);
      expect(result).toBe(true);

      // Verify task is soft deleted
      const deleted = await db.get('SELECT * FROM tasks WHERE id = ?', [task.id]);
      expect(deleted.is_deleted).toBe(1);
      expect(deleted.sync_status).toBe('pending');
    });

    it('should return false for non-existent task', async () => {
      const result = await TaskService.deleteTask('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('getAllTasks', () => {
    it('should return only non-deleted tasks', async () => {
      // Create some tasks
      await TaskService.createTask({ title: 'Task 1' });
      await TaskService.createTask({ title: 'Task 2' });
      const toDelete = await TaskService.createTask({ title: 'Task 3' });

      // Delete one task
      await TaskService.deleteTask(toDelete.id);

      const tasks = await TaskService.getAllTasks();
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks.find(t => t.title === 'Task 3')).toBeUndefined();
    });
  });

  describe('getTasksNeedingSync', () => {
    it('should return tasks with pending or error sync status', async () => {
      // Create tasks with different sync statuses
      const task1 = await TaskService.createTask({ title: 'Pending Task' });
      const task2 = await TaskService.createTask({ title: 'Another Pending' });

      // Manually update one task to 'synced' status
      await db.run('UPDATE tasks SET sync_status = ? WHERE id = ?', ['synced', task2.id]);

      const needingSync = await TaskService.getTasksNeedingSync();
      expect(needingSync.length).toBeGreaterThanOrEqual(1);
      expect(needingSync.some(t => t.id === task1.id)).toBe(true);
    });
  });
});