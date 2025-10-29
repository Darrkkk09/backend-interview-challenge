import express from 'express';
import cors from 'cors';
import taskRouter from './routes/tasks';
import { initDB } from './db/database';
import syncRouter from './routes/sync';
import errorHandler from './middleware/errorHandler';


const app = express();
const PORT = 3000;


// Middleware
app.use(cors());
app.use(express.json());

async function start() {
  try {
    // Initialize DB properly
    const db = await initDB();
    console.log('Database initialized');

    // Register routes
    // If your routes don’t need direct db access, just use router directly
    app.use('/api/tasks', taskRouter);
    app.use('/api', syncRouter);

    // Error handler
    app.use(errorHandler);

    app.get('/', (_req, res) => {
      res.send('Welcome to the Task Management API , Move to /api/tasks to manage your tasks.');
    });
    app.get('/health',(_req, res) => {
      return res.json({status: 'ok',
        "timestamp": new Date().toISOString()
      });
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
