import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import crypto from 'crypto';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { newPortfolioItem } from '../../models/portfolio';
import { processAndUploadPortfolioImage, processUploadedPortfolioImage } from '../../services/imageProcessing';
import { generatePresignedDownloadUrl, generatePresignedUploadUrl, deleteFileFromS3 } from '../../services/s3';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const items = await db.collection('portfolio_items').find().sort({ sort_order: 1 }).toArray();
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
  res.json({ items: mapped });
});

router.post('/', requireAdmin, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ detail: 'Image file required' }); return; }
  const { title, category = 'general', description } = req.body;
  if (!title) { res.status(400).json({ detail: 'Title required' }); return; }
  const lowerName = req.file.originalname.toLowerCase();
  if (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
    res.status(422).json({ detail: 'HEIC/HEIF format is not supported. Please convert to JPEG or PNG first.' });
    return;
  }
  const db = await getDb();
  try {
    const result = await processAndUploadPortfolioImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    const count = await db.collection('portfolio_items').countDocuments();
    const item = newPortfolioItem(title, result.image_key, result.thumbnail_key, category, description ?? null, count);
    const insert = await db.collection('portfolio_items').insertOne(item);
    res.status(201).json({ id: insert.insertedId.toString(), message: 'Portfolio item created' });
  } catch (err) {
    console.error('[PORTFOLIO] Failed to process image:', err);
    res.status(422).json({ detail: 'Failed to process image. Please ensure the file is a valid JPEG or PNG.' });
  }
});

router.post('/presign', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { filename, mime_type } = req.body;
  if (!filename || !mime_type) { res.status(400).json({ detail: 'filename and mime_type required' }); return; }
  const lowerName = (filename as string).toLowerCase();
  if (mime_type === 'image/heic' || mime_type === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif')) {
    res.status(422).json({ detail: 'HEIC/HEIF format is not supported.' }); return;
  }
  const fileId = crypto.randomBytes(16).toString('hex');
  const tempKey = `portfolio/uploads/${fileId}.jpg`;
  const upload_url = await generatePresignedUploadUrl(tempKey, mime_type as string, 3600);
  res.json({ upload_url, temp_key: tempKey, file_id: fileId });
});

router.post('/process', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { temp_key, file_id, title, category } = req.body;
  if (!temp_key || !title) { res.status(400).json({ detail: 'temp_key and title required' }); return; }
  const fileId = file_id || (temp_key as string).split('/').pop()!.replace('.jpg', '');
  const db = await getDb();
  try {
    const result = await processUploadedPortfolioImage(temp_key, fileId);
    const count = await db.collection('portfolio_items').countDocuments();
    const item = newPortfolioItem(title, result.image_key, result.thumbnail_key, category || 'general', null, count);
    const insert = await db.collection('portfolio_items').insertOne(item);
    res.status(201).json({ id: insert.insertedId.toString() });
  } catch (err) {
    console.error('[PORTFOLIO] Failed to process image:', err);
    res.status(422).json({ detail: 'Failed to process image.' });
  }
});

router.put('/reorder', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { item_ids } = req.body;
  if (!Array.isArray(item_ids)) { res.status(400).json({ detail: 'item_ids must be an array' }); return; }
  const db = await getDb();
  await Promise.all(item_ids.map((id: string, idx: number) =>
    db.collection('portfolio_items').updateOne({ _id: new ObjectId(id) }, { $set: { sort_order: idx } })
  ));
  res.json({ message: 'Reordered' });
});

router.put('/:itemId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const allowed = ['title', 'description', 'category', 'is_visible', 'sort_order'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) { res.status(400).json({ detail: 'No fields to update' }); return; }
  const result = await db.collection('portfolio_items').updateOne({ _id: new ObjectId(req.params.itemId) }, { $set: update });
  if (!result.matchedCount) { res.status(404).json({ detail: 'Item not found' }); return; }
  res.json({ message: 'Updated' });
});

router.delete('/:itemId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const item = await db.collection('portfolio_items').findOne({ _id: new ObjectId(req.params.itemId) });
  if (!item) { res.status(404).json({ detail: 'Item not found' }); return; }
  if (item.image_key) await deleteFileFromS3(item.image_key);
  if (item.thumbnail_key) await deleteFileFromS3(item.thumbnail_key);
  await db.collection('portfolio_items').deleteOne({ _id: new ObjectId(req.params.itemId) });
  res.json({ message: 'Deleted' });
});

export default router;
