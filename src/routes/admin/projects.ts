import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { newProject } from '../../models/project';
import { newUser } from '../../models/user';
import { newInvoice } from '../../models/invoice';
import { hashPassword, createInviteToken } from '../../services/auth';
import { sendInviteEmail, sendGalleryLinkEmail } from '../../services/email';
import { deletePrefixFromS3 } from '../../services/s3';
import { generateShareToken } from '../../utils/tokens';

const router = Router();

function projectResponse(p: Record<string, unknown>) {
  return {
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
  };
}

router.get('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const query: Record<string, unknown> = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.client_id) query.client_id = req.query.client_id;
  const projects = await db.collection('projects').find(query).sort({ created_at: -1 }).toArray();
  res.json({ projects: projects.map(projectResponse) });
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, client_email, client_name, description, categories, inquiry_id } = req.body;
  if (!title || !client_email || !client_name) { res.status(400).json({ detail: 'title, client_email, client_name required' }); return; }
  const db = await getDb();
  let clientId: string;
  const existing = await db.collection('users').findOne({ email: client_email });
  if (!existing) {
    const inviteToken = createInviteToken();
    const clientDoc = newUser(client_email, hashPassword(inviteToken), 'client', client_name);
    (clientDoc as Record<string, unknown>).invite_token = inviteToken;
    const result = await db.collection('users').insertOne(clientDoc);
    clientId = result.insertedId.toString();
    await sendInviteEmail(client_email, client_name, inviteToken);
  } else {
    clientId = existing._id.toString();
  }
  const project = newProject(title, clientId, description ?? '', categories ?? []);
  const insert = await db.collection('projects').insertOne(project);
  if (inquiry_id) {
    await db.collection('inquiries').updateOne({ _id: new ObjectId(inquiry_id) }, { $set: { status: 'booked' } });
  }
  res.status(201).json({ id: insert.insertedId.toString(), client_id: clientId, message: 'Project created' });
});

router.get('/:projectId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const p = await db.collection('projects').findOne({ _id: new ObjectId(req.params.projectId) });
  if (!p) { res.status(404).json({ detail: 'Project not found' }); return; }
  res.json(projectResponse(p));
});

router.put('/:projectId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const allowed = ['title', 'description', 'categories', 'cover_image_key', 'status', 'share_link_expires_at', 'project_expires_at'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  if (!Object.keys(update).length) { res.status(400).json({ detail: 'No fields to update' }); return; }
  update.updated_at = new Date();
  const db = await getDb();
  const result = await db.collection('projects').updateOne({ _id: new ObjectId(req.params.projectId) }, { $set: update });
  if (!result.matchedCount) { res.status(404).json({ detail: 'Project not found' }); return; }
  res.json({ message: 'Updated' });
});

router.delete('/:projectId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(req.params.projectId) });
  if (!project) { res.status(404).json({ detail: 'Project not found' }); return; }
  await deletePrefixFromS3(`projects/${req.params.projectId}/`);
  await db.collection('media').deleteMany({ project_id: req.params.projectId });
  await db.collection('projects').deleteOne({ _id: new ObjectId(req.params.projectId) });
  res.json({ message: 'Project and all media deleted' });
});

router.post('/:projectId/deliver', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(req.params.projectId) });
  if (!project) { res.status(404).json({ detail: 'Project not found' }); return; }
  const token = generateShareToken();
  const update: Record<string, unknown> = { share_link_token: token, status: 'delivered', updated_at: new Date() };
  if (req.body.share_link_expires_at) update.share_link_expires_at = new Date(req.body.share_link_expires_at);
  if (req.body.project_expires_at) update.project_expires_at = new Date(req.body.project_expires_at);
  await db.collection('projects').updateOne({ _id: new ObjectId(req.params.projectId) }, { $set: update });

  let invoiceToken: string | null = null;
  if (req.body.create_invoice) {
    const { invoice_line_items, invoice_due_date } = req.body;
    if (!invoice_line_items || !invoice_due_date) {
      res.status(400).json({ detail: 'Line items and due date required when creating an invoice' }); return;
    }
    const totalCents = invoice_line_items.reduce((sum: number, li: { amount_cents: number; quantity: number }) => sum + li.amount_cents * li.quantity, 0);
    const invoice = newInvoice(project.client_id as string, totalCents, invoice_line_items, new Date(invoice_due_date), req.params.projectId);
    (invoice as Record<string, unknown>).status = 'sent';
    await db.collection('invoices').insertOne(invoice);
    invoiceToken = (invoice as Record<string, unknown>).token as string;
  }

  const client = await db.collection('users').findOne({ _id: new ObjectId(project.client_id as string) });
  if (client) {
    await sendGalleryLinkEmail(client.email, client.name ?? '', token, project.title as string);
  }
  res.json({ share_link_token: token, invoice_token: invoiceToken, message: 'Project delivered' });
});

router.put('/:projectId/rescind', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(req.params.projectId) });
  if (!project) { res.status(404).json({ detail: 'Project not found' }); return; }
  if (project.status !== 'delivered') { res.status(400).json({ detail: 'Only delivered projects can be rescinded' }); return; }
  await db.collection('projects').updateOne(
    { _id: new ObjectId(req.params.projectId) },
    { $set: { status: 'active', share_link_token: null, share_link_expires_at: null, updated_at: new Date() } },
  );
  res.json({ message: 'Delivery rescinded, project returned to active' });
});

router.put('/:projectId/archive', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const project = await db.collection('projects').findOne({ _id: new ObjectId(req.params.projectId) });
  if (!project) { res.status(404).json({ detail: 'Project not found' }); return; }
  await deletePrefixFromS3(`projects/${req.params.projectId}/`);
  await db.collection('media').deleteMany({ project_id: req.params.projectId });
  await db.collection('projects').updateOne({ _id: new ObjectId(req.params.projectId) }, { $set: { status: 'archived', updated_at: new Date() } });
  res.json({ message: 'Project archived' });
});

export default router;
