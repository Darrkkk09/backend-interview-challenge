import { v4 as uuidv4 } from 'uuid';
import { initDB } from '../db/database';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean | number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean | number;
  sync_status: string;
}

export class TaskService {
  static async createTask(data: Partial<Task>): Promise<Task> {
    const db = await initDB();
    const now = new Date().toISOString();
    const task: Task = {
      id: uuidv4(),
      title: data.title!,
      description: data.description || null,
      completed: 0,
      created_at: now,
      updated_at: now,
      is_deleted: 0,
      sync_status: 'pending',
    };

    await db.run(
      `INSERT INTO tasks (id,title,description,completed,created_at,updated_at,is_deleted,sync_status)
       VALUES (?,?,?,?,?,?,?,?)`,
      [task.id, task.title, task.description, 0, now, now, 0, 'pending']
    );

    await db.run(
      `INSERT INTO sync_queue (task_id,operation,task_data,created_at)
       VALUES (?,?,?,?)`,
      [task.id, 'create', JSON.stringify(task), now]
    );

    return task;
  }

  static async getAllTasks(): Promise<Task[]> {
    const db = await initDB();
    const rows: Task[] = await db.all(`SELECT * FROM tasks WHERE is_deleted=0`);
    return rows.map((row) => ({ ...row, completed: !!row.completed }));
  }

  static async getTaskById(id: string): Promise<Task | null> {
    const db = await initDB();
    const row = await db.get<Task | undefined>(`SELECT * FROM tasks WHERE id=?`, [id]);
    return row ? { ...row, completed: !!row.completed } : null;
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const db = await initDB();
    const task = await this.getTaskById(id);
    if (!task) return null;

    const updated_at = new Date().toISOString();
    const newTask: Task = { ...task, ...updates, updated_at, sync_status: 'pending' };

    await db.run(
      `UPDATE tasks SET title=?, description=?, completed=?, updated_at=?, is_deleted=?, sync_status=? WHERE id=?`,
      [
        newTask.title,
        newTask.description,
        newTask.completed ? 1 : 0,
        updated_at,
        newTask.is_deleted ? 1 : 0,
        'pending',
        id,
      ]
    );

    await db.run(
      `INSERT INTO sync_queue (task_id,operation,task_data,created_at)
       VALUES (?,?,?,?)`,
      [id, 'update', JSON.stringify(newTask), updated_at]
    );

    return newTask;
  }

  static async deleteTask(id: string): Promise<boolean> {
    const db = await initDB();
    const task = await this.getTaskById(id);
    if (!task) return false;

    const updated_at = new Date().toISOString();
    const deletedTask = { ...task, is_deleted: 1 };

    await db.run(
      `UPDATE tasks SET is_deleted=1, updated_at=?, sync_status='pending' WHERE id=?`,
      [updated_at, id]
    );

    await db.run(
      `INSERT INTO sync_queue (task_id,operation,task_data,created_at)
       VALUES (?,?,?,?)`,
      [id, 'delete', JSON.stringify(deletedTask), updated_at]
    );

    return true;
  }
}
