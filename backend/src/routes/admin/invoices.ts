import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';
import { newInvoice } from '../../models/invoice';

const router = Router();

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const invoices = await db.collection('invoices').find().sort({ created_at: -1 }).toArray();
  res.json({ invoices: invoices.map((inv) => ({ id: inv._id.toString(), client_id: inv.client_id, project_id: inv.project_id ?? null, stripe_invoice_id: inv.stripe_invoice_id ?? '', amount_cents: inv.amount_cents, status: inv.status, due_date: inv.due_date, line_items: inv.line_items, created_at: inv.created_at, token: inv.token ?? '', paid_at: inv.paid_at ?? null })) });
});

router.post('/', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { client_id, line_items, due_date, project_id } = req.body;
  if (!client_id || !line_items || !due_date) { res.status(400).json({ detail: 'client_id, line_items, and due_date required' }); return; }
  const db = await getDb();
  const client = await db.collection('users').findOne({ _id: new ObjectId(client_id), role: 'client' });
  if (!client) { res.status(404).json({ detail: 'Client not found' }); return; }
  const totalCents = line_items.reduce((sum: number, item: { amount_cents: number; quantity: number }) => sum + item.amount_cents * item.quantity, 0);
  const invoice = newInvoice(client_id, totalCents, line_items, new Date(due_date), project_id ?? null);
  const result = await db.collection('invoices').insertOne(invoice);
  res.status(201).json({ id: result.insertedId.toString(), message: 'Invoice created' });
});

router.get('/:invoiceId', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const inv = await db.collection('invoices').findOne({ _id: new ObjectId(req.params.invoiceId) });
  if (!inv) { res.status(404).json({ detail: 'Invoice not found' }); return; }
  res.json({ id: inv._id.toString(), client_id: inv.client_id, project_id: inv.project_id ?? null, stripe_invoice_id: inv.stripe_invoice_id ?? '', amount_cents: inv.amount_cents, status: inv.status, due_date: inv.due_date, line_items: inv.line_items, created_at: inv.created_at, token: inv.token ?? '', paid_at: inv.paid_at ?? null });
});

router.put('/:invoiceId/status', requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const valid = ['draft', 'sent', 'paid', 'void'];
  const { status } = req.body;
  if (!valid.includes(status)) { res.status(400).json({ detail: `Status must be one of: ${valid.join(', ')}` }); return; }
  const db = await getDb();
  const update: Record<string, unknown> = { status };
  if (status === 'paid') update.paid_at = new Date();
  const result = await db.collection('invoices').updateOne({ _id: new ObjectId(req.params.invoiceId) }, { $set: update });
  if (!result.matchedCount) { res.status(404).json({ detail: 'Invoice not found' }); return; }
  res.json({ message: `Invoice marked as ${status}` });
});

export default router;
