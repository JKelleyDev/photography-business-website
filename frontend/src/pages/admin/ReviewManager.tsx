import { useState, useEffect } from 'react';
import { Check, MessageSquareQuote, Trash2, Undo2 } from 'lucide-react';
import api from '../../api/client';
import { Review } from '../../types';
import StarRating from '../../components/ui/StarRating';
import { formatDate } from '../../utils/dateHelpers';
import { Badge, Button, EmptyState, ListSkeleton, PageHeader, Segmented, Select, Toolbar } from '../../components/admin/ui';

const APPROVAL_FILTERS = ['pending', 'approved', 'all'] as const;
type Filter = (typeof APPROVAL_FILTERS)[number];

export default function ReviewManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState<Filter>('pending');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/reviews');
    setReviews(data.reviews);
    setLoading(false);
  }

  async function toggleApproval(review: Review) {
    setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_approved: !r.is_approved } : r)));
    await api.put(`/admin/reviews/${review.id}`, { is_approved: !review.is_approved });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this review? This can’t be undone.')) return;
    await api.delete(`/admin/reviews/${id}`);
    load();
  }

  const pendingCount = reviews.filter((r) => !r.is_approved).length;
  const filtered = reviews
    .filter((r) => (approvalFilter === 'pending' ? !r.is_approved : approvalFilter === 'approved' ? r.is_approved : true))
    .sort((a, b) => {
      if (sortBy === 'rating-high') return b.rating - a.rating;
      if (sortBy === 'rating-low') return a.rating - b.rating;
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'newest' ? -diff : diff;
    });

  return (
    <div>
      <PageHeader title="Reviews" description="Approved reviews appear on the public reviews page." />

      <Toolbar>
        <Segmented label="Filter reviews" value={approvalFilter} onChange={setApprovalFilter} options={APPROVAL_FILTERS} counts={{ pending: pendingCount }} />
        <Select aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="sm:w-44">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="rating-high">Highest rating</option>
          <option value="rating-low">Lowest rating</option>
        </Select>
      </Toolbar>

      {loading ? <ListSkeleton rows={3} /> : filtered.length === 0 ? (
        <EmptyState icon={<MessageSquareQuote />} title={approvalFilter === 'pending' ? 'No reviews waiting' : 'No reviews here'}>
          {approvalFilter === 'pending' ? 'New reviews from the website land here for you to approve.' : 'Try another filter.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((review) => (
            <li key={review.id} className="rounded-lg border border-line bg-white">
              <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                <div>
                  <p className="font-semibold">{review.author_name}</p>
                  <div className="mt-1 flex items-center gap-2 text-[13px] text-fixer">
                    <StarRating rating={review.rating} readonly />
                    <span>{formatDate(review.created_at)}</span>
                  </div>
                </div>
                <Badge tone={review.is_approved ? 'success' : 'warn'}>{review.is_approved ? 'Approved' : 'Waiting'}</Badge>
              </div>
              <p className="px-4 pt-3 text-sm leading-relaxed sm:px-5">{review.body}</p>
              <div className="mt-4 flex gap-2 border-t border-line px-4 py-3 sm:px-5">
                {review.is_approved ? (
                  <Button variant="outline" size="sm" onClick={() => toggleApproval(review)}><Undo2 /> Unpublish</Button>
                ) : (
                  <Button size="sm" onClick={() => toggleApproval(review)}><Check /> Approve</Button>
                )}
                <Button variant="ghost" size="sm" className="ml-auto text-safelight hover:bg-red-50" onClick={() => handleDelete(review.id)}>
                  <Trash2 /> Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
