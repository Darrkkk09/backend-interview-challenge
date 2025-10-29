import { Request, Response } from 'express';

function errorHandler(err: any, _req: Request, res: Response): void {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
}

export default errorHandler;

