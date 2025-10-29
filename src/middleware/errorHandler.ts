import { Request, Response, NextFunction } from 'express';

function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
}

export default errorHandler;
