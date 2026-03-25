import { Router, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../../database';
import { requireClient, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireClient, async (req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const userId = req.user!._id as string;
  const invoices = await db.collection('invoices').find({ client_id: userId }).sort({ created_at: -1 }).toArray();
  res.json({
    invoices: invoices.map((inv) => ({
      id: (inv._id as ObjectId).toString(),
      client_id: inv.client_id,
      project_id: inv.project_id ?? null,
      stripe_invoice_id: inv.stripe_invoice_id ?? '',
      amount_cents: inv.amount_cents,
      status: inv.status,
      due_date: inv.due_date,
      line_items: inv.line_items,
      created_at: inv.created_at,
      paid_at: inv.paid_at ?? null,
    })),
  });
});

export default router;
