import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireClient, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireClient, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const userId = req.user!._id as string;
  const projects = await db.collection('projects').find({ client_id: userId }).sort({ created_at: -1 }).toArray();
  res.json({
    projects: projects.map((p) => ({
      id: (p._id as ObjectId).toString(),
      title: p.title,
      description: p.description,
      client_id: p.client_id,
      status: p.status,
      cover_image_key: p.cover_image_key ?? null,
      categories: p.categories ?? [],
      share_link_token: p.share_link_token ?? null,
      share_link_expires_at: p.share_link_expires_at ?? null,
      project_expires_at: p.project_expires_at ?? null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
  });
});

export default router;
