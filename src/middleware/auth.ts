import { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { decodeToken } from '../services/auth';
import { getDb } from '../database';

export interface AuthRequest extends Request {
  user?: Record<string, unknown>;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Missing token' });
    return;
  }
  const token = authHeader.slice(7);
  const payload = decodeToken(token);
  if (!payload || payload.type !== 'access') {
    res.status(401).json({ detail: 'Invalid token' });
    return;
  }
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(payload.sub as string), is_active: true });
    if (!user) {
      res.status(401).json({ detail: 'User not found' });
      return;
    }
    req.user = { ...user, _id: user._id.toString() };
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid token' });
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ detail: 'Admin access required' });
      return;
    }
    next();
  });
}

export async function requireClient(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    if (req.user?.role !== 'client') {
      res.status(403).json({ detail: 'Client access required' });
      return;
    }
    next();
  });
}
