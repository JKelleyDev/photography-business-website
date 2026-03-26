import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import multer from 'multer';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { newMedia } from '../../models/media';
import { processAndUploadImage } from '../../services/imageProcessing';
import { generatePresignedDownloadUrl, deleteFileFromS3 } from '../../services/s3';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/:projectId/media', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const mediaItems = await db.collection('media').find({ project_id: req.params.projectId }).sort({ sort_order: 1 }).toArray();
  const mapped = await Promise.all(mediaItems.map(async (m) => ({
    id: m._id.toString(),
    project_id: m.project_id,
    original_url: await generatePresignedDownloadUrl(m.original_key),
    compressed_url: await generatePresignedDownloadUrl(m.compressed_key),
    thumbnail_url: await generatePresignedDownloadUrl(m.thumbnail_key),
    filename: m.filename,
    mime_type: m.mime_type,
    width: m.width,
    height: m.height,
    size_bytes: m.size_bytes,
    compressed_size_bytes: m.compressed_size_bytes,
    sort_order: m.sort_order,
    uploaded_at: m.uploaded_at,
    is_selected: m.is_selected,
  })));
  res.json({ media: mapped });
});

router.post('/:projectId/media', requireAdmin, upload.array('files'), async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files?.length) { res.status(400).json({ detail: 'No files uploaded' }); return; }
  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(req.params.projectId) });
  if (!project) { res.status(404).json({ detail: 'Project not found' }); return; }
  const count = await db.collection('media').countDocuments({ project_id: req.params.projectId });
  const uploadedIds: string[] = [];
  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const result = await processAndUploadImage(file.buffer, req.params.projectId, file.originalname, file.mimetype);
    const mediaDoc = newMedia(req.params.projectId, result.original_key, result.compressed_key, result.thumbnail_key, result.watermarked_key, file.originalname, file.mimetype, result.width, result.height, result.size_bytes, result.compressed_size_bytes, count + idx);
    const insert = await db.collection('media').insertOne(mediaDoc);
    uploadedIds.push(insert.insertedId.toString());
  }
  res.status(201).json({ media_ids: uploadedIds, message: `${uploadedIds.length} files uploaded` });
});

router.delete('/:projectId/media/:mediaId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const m = await db.collection('media').findOne({ _id: new ObjectId(req.params.mediaId), project_id: req.params.projectId });
  if (!m) { res.status(404).json({ detail: 'Media not found' }); return; }
  await Promise.all([
    deleteFileFromS3(m.original_key),
    deleteFileFromS3(m.compressed_key),
    deleteFileFromS3(m.thumbnail_key),
    m.watermarked_key ? deleteFileFromS3(m.watermarked_key) : Promise.resolve(),
  ]);
  await db.collection('media').deleteOne({ _id: new ObjectId(req.params.mediaId) });
  res.json({ message: 'Deleted' });
});

router.put('/:projectId/media/reorder', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { media_ids } = req.body;
  if (!Array.isArray(media_ids)) { res.status(400).json({ detail: 'media_ids must be an array' }); return; }
  const db = await getDb();
  await Promise.all(media_ids.map((id: string, idx: number) =>
    db.collection('media').updateOne({ _id: new ObjectId(id), project_id: req.params.projectId }, { $set: { sort_order: idx } })
  ));
  res.json({ message: 'Reordered' });
});

export default router;
