import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (req.query.status) query.status = req.query.status;
  const inquiries = await db.collection('inquiries').find(query).sort({ created_at: -1 }).toArray();
  res.json({ inquiries: inquiries.map((inq) => ({ id: inq._id.toString(), name: inq.name, email: inq.email, phone: inq.phone ?? null, package_id: inq.package_id ?? null, message: inq.message, event_date: inq.event_date ?? null, event_time: inq.event_time ?? null, event_duration: inq.event_duration ?? null, status: inq.status, created_at: inq.created_at })) });
});

router.get('/:inquiryId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const inq = await db.collection('inquiries').findOne({ _id: new ObjectId(req.params.inquiryId) });
  if (!inq) { res.status(404).json({ detail: 'Inquiry not found' }); return; }
  res.json({ id: inq._id.toString(), name: inq.name, email: inq.email, phone: inq.phone ?? null, package_id: inq.package_id ?? null, message: inq.message, event_date: inq.event_date ?? null, event_time: inq.event_time ?? null, event_duration: inq.event_duration ?? null, status: inq.status, created_at: inq.created_at });
});

router.put('/:inquiryId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const valid = ['new', 'contacted', 'booked', 'closed'];
  if (!valid.includes(req.body.status)) { res.status(400).json({ detail: `Status must be one of: ${valid.join(', ')}` }); return; }
  const db = await getDb();
  const result = await db.collection('inquiries').updateOne({ _id: new ObjectId(req.params.inquiryId) }, { $set: { status: req.body.status } });
  if (!result.matchedCount) { res.status(404).json({ detail: 'Inquiry not found' }); return; }
  res.json({ message: 'Updated' });
});

export default router;
