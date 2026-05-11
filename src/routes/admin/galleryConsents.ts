import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { generatePresignedDownloadUrl } from '../../services/s3';

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
    const publishedPhotos = await db.collection('media').countDocuments({ project_id: projectId, in_public_gallery: true });
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
    compressed_url: await generatePresignedDownloadUrl(m.compressed_key),
    filename: m.filename,
    in_public_gallery: m.in_public_gallery ?? false,
    sort_order: m.sort_order,
  })));

  res.json({ media: mapped });
});

// Toggle whether a specific photo is in the public gallery
router.put('/:projectId/media/:mediaId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(req.params.projectId),
    'gallery_consent.status': 'agree',
  });
  if (!project) { res.status(404).json({ detail: 'Project not found or no consent on file' }); return; }

  const { in_public_gallery } = req.body;
  if (typeof in_public_gallery !== 'boolean') {
    res.status(400).json({ detail: 'in_public_gallery must be a boolean' });
    return;
  }

  const result = await db.collection('media').updateOne(
    { _id: new ObjectId(req.params.mediaId), project_id: req.params.projectId },
    { $set: { in_public_gallery } },
  );
  if (!result.matchedCount) { res.status(404).json({ detail: 'Media not found' }); return; }
  res.json({ in_public_gallery });
});

// Bulk publish/unpublish all photos for a project
router.put('/:projectId/media', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(req.params.projectId),
    'gallery_consent.status': 'agree',
  });
  if (!project) { res.status(404).json({ detail: 'Project not found or no consent on file' }); return; }

  const { media_ids, in_public_gallery } = req.body;
  if (!Array.isArray(media_ids) || typeof in_public_gallery !== 'boolean') {
    res.status(400).json({ detail: 'media_ids (array) and in_public_gallery (boolean) required' });
    return;
  }

  await db.collection('media').updateMany(
    { _id: { $in: media_ids.map((id: string) => new ObjectId(id)) }, project_id: req.params.projectId },
    { $set: { in_public_gallery } },
  );
  res.json({ message: 'Updated' });
});

export default router;
