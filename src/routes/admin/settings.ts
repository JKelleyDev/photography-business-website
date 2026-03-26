import { Router, Response } from 'express';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const settings = await db.collection('site_settings').find().toArray();
  res.json({ settings: settings.map((s) => ({ key: s.key, value: s.value })) });
});

router.put('/:key', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { value } = req.body;
  const db = await getDb();
  await db.collection('site_settings').updateOne(
    { key: req.params.key },
    { $set: { key: req.params.key, value } },
    { upsert: true },
  );
  res.json({ message: 'Setting updated' });
});

export default router;
