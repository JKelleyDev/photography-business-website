import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../database';
import { generatePresignedDownloadUrl } from '../services/s3';
import { newInquiry } from '../models/inquiry';
import { newReview } from '../models/review';

const router = Router();

router.get('/portfolio', async (req: Request, res: Response): Promise<void> => {
  const { category, page = '1', limit = '20' } = req.query as Record<string, string>;
  const db = await getDb();
  const query: Record<string, unknown> = { is_visible: true };
  if (category) query.category = category;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const items = await db.collection('portfolio_items').find(query).sort({ sort_order: 1 }).skip(skip).limit(parseInt(limit)).toArray();
  const total = await db.collection('portfolio_items').countDocuments(query);
  const mapped = await Promise.all(items.map(async (item) => ({
    id: item._id.toString(),
    title: item.title,
    description: item.description ?? null,
    category: item.category,
    image_url: item.image_key ? await generatePresignedDownloadUrl(item.image_key) : null,
    thumbnail_url: item.thumbnail_key ? await generatePresignedDownloadUrl(item.thumbnail_key) : null,
    sort_order: item.sort_order,
    is_visible: item.is_visible,
  })));
  res.json({ items: mapped, total, page: parseInt(page), limit: parseInt(limit) });
});

router.get('/portfolio/:itemId', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb();
  const item = await db.collection('portfolio_items').findOne({ _id: new ObjectId(req.params.itemId), is_visible: true });
  if (!item) { res.status(404).json({ detail: 'Item not found' }); return; }
  res.json({
    id: item._id.toString(),
    title: item.title,
    description: item.description ?? null,
    category: item.category,
    image_url: item.image_key ? await generatePresignedDownloadUrl(item.image_key) : null,
    thumbnail_url: item.thumbnail_key ? await generatePresignedDownloadUrl(item.thumbnail_key) : null,
    sort_order: item.sort_order,
    is_visible: item.is_visible,
  });
});

router.get('/pricing', async (_req: Request, res: Response): Promise<void> => {
  const db = await getDb();
  const packages = await db.collection('pricing_packages').find({ is_visible: true }).sort({ sort_order: 1 }).toArray();
  res.json({ packages: packages.map((pkg) => ({ id: pkg._id.toString(), name: pkg.name, description: pkg.description, price_cents: pkg.price_cents, price_display: pkg.price_display, features: pkg.features, is_custom: pkg.is_custom, sort_order: pkg.sort_order, is_visible: pkg.is_visible })) });
});

router.post('/inquiries', async (req: Request, res: Response): Promise<void> => {
  const { name, email, message, phone, package_id, event_date, event_time, event_duration } = req.body;
  if (!name || !email || !message) { res.status(400).json({ detail: 'Name, email, and message are required' }); return; }
  const db = await getDb();
  const inquiry = newInquiry(name, email, message, phone ?? null, package_id ?? null, event_date ? new Date(event_date) : null, event_time ?? null, event_duration ?? null);
  const result = await db.collection('inquiries').insertOne(inquiry);
  res.status(201).json({ id: result.insertedId.toString(), message: 'Inquiry submitted successfully' });
});

router.get('/reviews', async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>;
  const db = await getDb();
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const reviews = await db.collection('reviews').find({ is_approved: true }).sort({ created_at: -1 }).skip(skip).limit(parseInt(limit)).toArray();
  const total = await db.collection('reviews').countDocuments({ is_approved: true });
  res.json({ reviews: reviews.map((r) => ({ id: r._id.toString(), author_name: r.author_name, rating: r.rating, body: r.body, is_approved: r.is_approved, created_at: r.created_at })), total, page: parseInt(page), limit: parseInt(limit) });
});

router.post('/reviews', async (req: Request, res: Response): Promise<void> => {
  const { author_name, email, rating, body, project_id } = req.body;
  if (!author_name || !email || !rating || !body) { res.status(400).json({ detail: 'All fields required' }); return; }
  const db = await getDb();
  const review = newReview(author_name, email, rating, body, project_id ?? null);
  const result = await db.collection('reviews').insertOne(review);
  res.status(201).json({ id: result.insertedId.toString(), message: 'Review submitted and pending approval' });
});

router.get('/settings', async (_req: Request, res: Response): Promise<void> => {
  const db = await getDb();
  const settings = await db.collection('site_settings').find().toArray();
  res.json({ settings: settings.map((s) => ({ key: s.key, value: s.value })) });
});

router.get('/settings/:key', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb();
  const setting = await db.collection('site_settings').findOne({ key: req.params.key });
  if (!setting) { res.status(404).json({ detail: 'Setting not found' }); return; }
  res.json({ key: setting.key, value: setting.value });
});

router.get('/invoice/:token', async (req: Request, res: Response): Promise<void> => {
  const db = await getDb();
  const inv = await db.collection('invoices').findOne({ token: req.params.token });
  if (!inv) { res.status(404).json({ detail: 'Invoice not found' }); return; }
  const businessNameSetting = await db.collection('site_settings').findOne({ key: 'business_name' });
  const businessName = businessNameSetting?.value ?? 'MAD Photos';
  res.json({ amount_cents: inv.amount_cents, status: inv.status, due_date: inv.due_date, line_items: inv.line_items, paid_at: inv.paid_at ?? null, business_name: businessName });
});

export default router;
