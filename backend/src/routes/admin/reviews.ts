import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const reviews = await db.collection('reviews').find().sort({ created_at: -1 }).toArray();
  res.json({ reviews: reviews.map((r) => ({ id: r._id.toString(), author_name: r.author_name, rating: r.rating, body: r.body, is_approved: r.is_approved, created_at: r.created_at })) });
});

router.put('/:reviewId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = ['is_approved', 'body', 'author_name', 'rating'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) { res.status(400).json({ detail: 'No fields to update' }); return; }
  const db = await getDb();
  const result = await db.collection('reviews').updateOne({ _id: new ObjectId(req.params.reviewId) }, { $set: update });
  if (!result.matchedCount) { res.status(404).json({ detail: 'Review not found' }); return; }
  res.json({ message: 'Updated' });
});

router.delete('/:reviewId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const result = await db.collection('reviews').deleteOne({ _id: new ObjectId(req.params.reviewId) });
  if (!result.deletedCount) { res.status(404).json({ detail: 'Review not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
