import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[ERROR]', err.message);
  const isMongoError = err.message?.includes('ECONNREFUSED') || err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError';
  if (isMongoError) {
    res.status(503).json({ detail: 'Database unavailable' });
    return;
  }
  res.status(500).json({ detail: 'Internal server error' });
}
