import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../database';
import { generatePresignedDownloadUrl } from '../services/s3';
import { streamZipToResponse } from '../utils/zipStream';

const router = Router();

async function getValidProject(token: string, res: Response): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  const project = await db.collection('projects').findOne({ share_link_token: token });
  if (!project) { res.status(404).json({ detail: 'Gallery not found' }); return null; }
  if (project.share_link_expires_at && new Date(project.share_link_expires_at) < new Date()) {
    res.status(410).json({ detail: 'Gallery link has expired' }); return null;
  }
  if (project.status === 'archived') { res.status(410).json({ detail: 'Gallery is no longer available' }); return null; }
  return project;
}

async function getUnpaidInvoice(projectId: string): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  return db.collection('invoices').findOne({ project_id: projectId, status: { $nin: ['paid', 'void'] } });
}

router.get('/:token', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const projectId = (project._id as ObjectId).toString();
  const unpaid = await getUnpaidInvoice(projectId);
  res.json({
    title: project.title,
    description: project.description,
    status: project.status,
    categories: project.categories,
    share_link_expires_at: project.share_link_expires_at ?? null,
    downloads_locked: unpaid !== null,
    invoice_token: unpaid ? (unpaid.token ?? null) : null,
  });
});

router.get('/:token/media', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const db = await getDb();
  const projectId = (project._id as ObjectId).toString();
  const unpaid = await getUnpaidInvoice(projectId);
  const mediaItems = await db.collection('media').find({ project_id: projectId }).sort({ sort_order: 1 }).toArray();
  const mapped = await Promise.all(mediaItems.map(async (m) => ({
    id: m._id.toString(),
    project_id: m.project_id,
    compressed_url: await generatePresignedDownloadUrl(m.compressed_key),
    thumbnail_url: await generatePresignedDownloadUrl(m.thumbnail_key),
    watermarked_url: m.watermarked_key ? await generatePresignedDownloadUrl(m.watermarked_key) : null,
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
  res.json({ media: mapped, downloads_locked: unpaid !== null });
});

router.post('/:token/select', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const { media_ids, selected } = req.body;
  if (!Array.isArray(media_ids)) { res.status(400).json({ detail: 'media_ids must be an array' }); return; }
  const db = await getDb();
  await db.collection('media').updateMany(
    { _id: { $in: media_ids.map((id: string) => new ObjectId(id)) } },
    { $set: { is_selected: selected } },
  );
  res.json({ message: 'Selection updated' });
});

router.get('/:token/media/:mediaId/download-url', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const projectId = (project._id as ObjectId).toString();
  if (await getUnpaidInvoice(projectId)) { res.status(402).json({ detail: 'Downloads are locked until the invoice is paid' }); return; }
  const db = await getDb();
  const m = await db.collection('media').findOne({ _id: new ObjectId(req.params.mediaId), project_id: projectId });
  if (!m) { res.status(404).json({ detail: 'Media not found' }); return; }
  res.json({ url: await generatePresignedDownloadUrl(m.original_key, 600), filename: m.filename });
});

router.get('/:token/download-urls', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const projectId = (project._id as ObjectId).toString();
  if (await getUnpaidInvoice(projectId)) { res.status(402).json({ detail: 'Downloads are locked until the invoice is paid' }); return; }
  const db = await getDb();
  const scope = req.query.scope as string || 'selected';
  const query: Record<string, unknown> = { project_id: projectId };
  if (scope === 'selected') query.is_selected = true;
  const mediaItems = await db.collection('media').find(query).sort({ sort_order: 1 }).toArray();
  if (!mediaItems.length) { res.status(400).json({ detail: 'No images to download' }); return; }
  const files = await Promise.all(mediaItems.map(async (m) => ({
    url: await generatePresignedDownloadUrl(m.original_key, 600),
    filename: m.filename,
    size_bytes: m.size_bytes,
  })));
  res.json({ files });
});

router.get('/:token/download', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const projectId = (project._id as ObjectId).toString();
  if (await getUnpaidInvoice(projectId)) { res.status(402).json({ detail: 'Downloads are locked until the invoice is paid' }); return; }
  const db = await getDb();
  const mediaItems = await db.collection('media').find({ project_id: projectId, is_selected: true }).toArray();
  if (!mediaItems.length) { res.status(400).json({ detail: 'No images selected' }); return; }
  const keysAndNames = mediaItems.map((m) => ({ key: m.original_key, filename: m.filename }));
  await streamZipToResponse(keysAndNames, `${project.title}_selected.zip`, res);
});

router.get('/:token/download-all', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const projectId = (project._id as ObjectId).toString();
  if (await getUnpaidInvoice(projectId)) { res.status(402).json({ detail: 'Downloads are locked until the invoice is paid' }); return; }
  const db = await getDb();
  const mediaItems = await db.collection('media').find({ project_id: projectId }).toArray();
  if (!mediaItems.length) { res.status(400).json({ detail: 'No images in gallery' }); return; }
  const keysAndNames = mediaItems.map((m) => ({ key: m.original_key, filename: m.filename }));
  await streamZipToResponse(keysAndNames, `${project.title}_all.zip`, res);
});

router.post('/:token/shutterfly-export', async (req: Request, res: Response): Promise<void> => {
  const project = await getValidProject(req.params.token, res);
  if (!project) return;
  const projectId = (project._id as ObjectId).toString();
  if (await getUnpaidInvoice(projectId)) { res.status(402).json({ detail: 'Downloads are locked until the invoice is paid' }); return; }
  const db = await getDb();
  const mediaItems = await db.collection('media').find({ project_id: projectId, is_selected: true }).toArray();
  if (!mediaItems.length) { res.status(400).json({ detail: 'No images selected for export' }); return; }
  const keysAndNames = mediaItems.map((m) => ({ key: m.original_key, filename: m.filename }));
  res.setHeader('X-Shutterfly-Redirect', 'https://www.shutterfly.com/photos/upload');
  await streamZipToResponse(keysAndNames, `${project.title}_for_printing.zip`, res);
});

export default router;
