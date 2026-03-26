import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Review } from '../../types';
import StarRating from '../../components/ui/StarRating';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/dateHelpers';

const APPROVAL_FILTERS = ['all', 'pending', 'approved'] as const;

export default function ReviewManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalFilter, setApprovalFilter] = useState<string>('pending');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating-high' | 'rating-low'>('newest');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/reviews');
    setReviews(data.reviews);
    setLoading(false);
  }

  async function toggleApproval(review: Review) {
    await api.put(`/admin/reviews/${review.id}`, { is_approved: !review.is_approved });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this review?')) return;
    await api.delete(`/admin/reviews/${id}`);
    load();
  }

  const filtered = reviews
    .filter((r) => {
      if (approvalFilter === 'pending') return !r.is_approved;
      if (approvalFilter === 'approved') return r.is_approved;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'rating-high') return b.rating - a.rating;
      if (sortBy === 'rating-low') return a.rating - b.rating;
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortBy === 'newest' ? -diff : diff;
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Reviews</h1>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {APPROVAL_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setApprovalFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                approvalFilter === f ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="rating-high">Highest rating</option>
          <option value="rating-low">Lowest rating</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <p className="text-muted text-center py-12">No reviews found.</p>
        ) : (
          filtered.map((review) => (
            <div key={review.id} className={`bg-white border rounded-lg p-4 ${!review.is_approved ? 'border-amber-200 bg-amber-50/30' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{review.author_name}</h3>
                  <p className="text-xs text-muted">{formatDate(review.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StarRating rating={review.rating} readonly />
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${review.is_approved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {review.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-700 mt-3">{review.body}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant={review.is_approved ? 'secondary' : 'primary'} onClick={() => toggleApproval(review)}>
                  {review.is_approved ? 'Unapprove' : 'Approve'}
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(review.id)}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
