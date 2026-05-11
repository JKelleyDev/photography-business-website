import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { generatePresignedDownloadUrl } from '../../services/s3';
import { newPortfolioItem } from '../../models/portfolio';

const router = Router();

// List all projects where the client has agreed to gallery usage
router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const projects = await db.collection('projects')
    .find({ 'gallery_consent.status': 'agree' })
    .sort({ 'gallery_consent.signed_at': -1 })
    .toArray();

  const result = await Promise.all(projects.map(async (p) => {
    const projectId = (p._id as ObjectId).toString();
    const client = await db.collection('users').findOne({ _id: new ObjectId(p.client_id) });
    const totalPhotos = await db.collection('media').countDocuments({ project_id: projectId });
    const publishedPhotos = await db.collection('media').countDocuments({
      project_id: projectId,
      portfolio_item_id: { $ne: null },
    });
    return {
      id: projectId,
      title: p.title,
      client_name: client?.name ?? 'Unknown',
      client_email: client?.email ?? '',
      signed_at: p.gallery_consent?.signed_at ?? null,
      total_photos: totalPhotos,
      published_photos: publishedPhotos,
    };
  }));

  res.json({ projects: result });
});

// Get all media for a project (must have agreed consent)
router.get('/:projectId/media', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(req.params.projectId),
    'gallery_consent.status': 'agree',
  });
  if (!project) { res.status(404).json({ detail: 'Project not found or no consent on file' }); return; }

  const mediaItems = await db.collection('media')
    .find({ project_id: req.params.projectId })
    .sort({ sort_order: 1 })
    .toArray();

  const mapped = await Promise.all(mediaItems.map(async (m) => ({
    id: (m._id as ObjectId).toString(),
    thumbnail_url: await generatePresignedDownloadUrl(m.thumbnail_key),
    filename: m.filename,
    in_portfolio: !!m.portfolio_item_id,
    portfolio_item_id: m.portfolio_item_id ?? null,
    sort_order: m.sort_order,
  })));

  res.json({ media: mapped });
});

// Publish a photo to the portfolio, or remove it
router.put('/:projectId/media/:mediaId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(req.params.projectId),
    'gallery_consent.status': 'agree',
  });
  if (!project) { res.status(404).json({ detail: 'Project not found or no consent on file' }); return; }

  const { publish } = req.body;
  if (typeof publish !== 'boolean') {
    res.status(400).json({ detail: 'publish must be a boolean' });
    return;
  }

  const media = await db.collection('media').findOne({
    _id: new ObjectId(req.params.mediaId),
    project_id: req.params.projectId,
  });
  if (!media) { res.status(404).json({ detail: 'Media not found' }); return; }

  if (publish) {
    if (media.portfolio_item_id) {
      res.json({ in_portfolio: true, portfolio_item_id: media.portfolio_item_id });
      return;
    }
    const count = await db.collection('portfolio_items').countDocuments();
    const category = (project.categories as string[] | undefined)?.[0] ?? 'general';
    const item = newPortfolioItem(
      project.title as string,
      media.compressed_key as string,
      media.thumbnail_key as string,
      category,
      null,
      count,
      (media._id as ObjectId).toString(),
    );
    const insert = await db.collection('portfolio_items').insertOne(item);
    const portfolioItemId = insert.insertedId.toString();
    await db.collection('media').updateOne(
      { _id: media._id },
      { $set: { portfolio_item_id: portfolioItemId } },
    );
    res.json({ in_portfolio: true, portfolio_item_id: portfolioItemId });
  } else {
    if (!media.portfolio_item_id) {
      res.json({ in_portfolio: false, portfolio_item_id: null });
      return;
    }
    await db.collection('portfolio_items').deleteOne({ _id: new ObjectId(media.portfolio_item_id) });
    await db.collection('media').updateOne(
      { _id: media._id },
      { $set: { portfolio_item_id: null } },
    );
    res.json({ in_portfolio: false, portfolio_item_id: null });
  }
});

export default router;
