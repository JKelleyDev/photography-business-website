import { Router, Response } from 'express';
import { getDb } from '../../database';
import { requireAdmin, AuthRequest } from '../../middleware/auth';

const router = Router();

router.get('/', requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  const db = await getDb();
  const [activeProjects, deliveredProjects, pendingInquiries, pendingReviews, totalClients] = await Promise.all([
    db.collection('projects').countDocuments({ status: 'active' }),
    db.collection('projects').countDocuments({ status: 'delivered' }),
    db.collection('inquiries').countDocuments({ status: 'new' }),
    db.collection('reviews').countDocuments({ is_approved: false }),
    db.collection('users').countDocuments({ role: 'client' }),
  ]);
  const revenueResult = await db.collection('invoices').aggregate([
    { $match: { status: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount_cents' } } },
  ]).toArray();
  const totalRevenueCents = revenueResult[0]?.total ?? 0;
  res.json({ active_projects: activeProjects, delivered_projects: deliveredProjects, pending_inquiries: pendingInquiries, pending_reviews: pendingReviews, total_clients: totalClients, total_revenue_cents: totalRevenueCents });
});

export default router;
