import { Router, Response } from 'express';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { newUser } from '../../models/user';
import { hashPassword, createInviteToken } from '../../services/auth';
import { sendInviteEmail } from '../../services/email';

const router = Router();

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const clients = await db.collection('users').find({ role: 'client' }).sort({ created_at: -1 }).toArray();
  res.json({ clients: clients.map((u) => ({ id: u._id.toString(), email: u.email, role: u.role, name: u.name ?? '', phone: u.phone ?? null, is_active: u.is_active })) });
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { email, name, phone } = req.body;
  if (!email || !name) { res.status(400).json({ detail: 'Email and name required' }); return; }
  const db = await getDb();
  const existing = await db.collection('users').findOne({ email });
  if (existing) { res.status(400).json({ detail: 'User with this email already exists' }); return; }
  const inviteToken = createInviteToken();
  const user = newUser(email, hashPassword(inviteToken), 'client', name);
  (user as Record<string, unknown>).phone = phone ?? null;
  (user as Record<string, unknown>).invite_token = inviteToken;
  const result = await db.collection('users').insertOne(user);
  // Invite email intentionally not sent — client portal accounts not yet enabled
  res.status(201).json({ id: result.insertedId.toString(), message: 'Client created' });
});

export default router;
