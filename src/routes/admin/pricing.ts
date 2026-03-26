import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { newPricingPackage } from '../../models/pricing';

const router = Router();

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const packages = await db.collection('pricing_packages').find().sort({ sort_order: 1 }).toArray();
  res.json({ packages: packages.map((pkg) => ({ id: pkg._id.toString(), name: pkg.name, description: pkg.description, price_cents: pkg.price_cents, price_display: pkg.price_display, features: pkg.features, is_custom: pkg.is_custom, sort_order: pkg.sort_order, is_visible: pkg.is_visible })) });
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, description, price_cents, price_display, features, is_custom } = req.body;
  if (!name || !description) { res.status(400).json({ detail: 'Name and description required' }); return; }
  const db = await getDb();
  const count = await db.collection('pricing_packages').countDocuments();
  const pkg = newPricingPackage(name, description, price_cents ?? 0, price_display ?? '', features ?? [], is_custom ?? false, count);
  const result = await db.collection('pricing_packages').insertOne(pkg);
  res.status(201).json({ id: result.insertedId.toString(), message: 'Package created' });
});

router.put('/:pkgId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = ['name', 'description', 'price_cents', 'price_display', 'features', 'is_custom', 'sort_order', 'is_visible'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) { res.status(400).json({ detail: 'No fields to update' }); return; }
  update.updated_at = new Date();
  const db = await getDb();
  const result = await db.collection('pricing_packages').updateOne({ _id: new ObjectId(req.params.pkgId) }, { $set: update });
  if (!result.matchedCount) { res.status(404).json({ detail: 'Package not found' }); return; }
  res.json({ message: 'Updated' });
});

router.delete('/:pkgId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const result = await db.collection('pricing_packages').deleteOne({ _id: new ObjectId(req.params.pkgId) });
  if (!result.deletedCount) { res.status(404).json({ detail: 'Package not found' }); return; }
  res.json({ message: 'Deleted' });
});

export default router;
