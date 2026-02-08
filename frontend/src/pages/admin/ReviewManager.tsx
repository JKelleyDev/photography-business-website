import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Review } from '../../types';
import StarRating from '../../components/ui/StarRating';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/dateHelpers';

export default function ReviewManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-primary mb-6">Reviews</h1>
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-muted text-center py-12">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
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
