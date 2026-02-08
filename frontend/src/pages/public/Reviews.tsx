import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Review } from '../../types';
import StarRating from '../../components/ui/StarRating';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatDate } from '../../utils/dateHelpers';

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ author_name: '', email: '', rating: 5, body: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/reviews').then(({ data }) => setReviews(data.reviews)).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/reviews', formData);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setSubmitting(false);
    }
  }

  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary mb-3">Reviews</h1>
        {reviews.length > 0 && (
          <div className="flex items-center justify-center gap-3">
            <StarRating rating={Math.round(avgRating)} readonly />
            <span className="text-muted text-sm">{avgRating.toFixed(1)} from {reviews.length} reviews</span>
          </div>
        )}
      </div>

      {/* Reviews list */}
      <div className="space-y-6 mb-12">
        {reviews.length === 0 ? (
          <p className="text-center text-muted py-12">No reviews yet. Be the first!</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-primary">{review.author_name}</h3>
                  <p className="text-xs text-muted">{formatDate(review.created_at)}</p>
                </div>
                <StarRating rating={review.rating} readonly />
              </div>
              <p className="text-gray-600">{review.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Leave a review */}
      <div className="max-w-xl mx-auto">
        {!showForm ? (
          <div className="text-center">
            <Button onClick={() => setShowForm(true)} size="lg">Leave a Review</Button>
          </div>
        ) : submitted ? (
          <div className="text-center py-12 bg-green-50 rounded-xl">
            <h3 className="text-xl font-semibold text-primary mb-2">Thank You!</h3>
            <p className="text-muted">Your review has been submitted and is pending approval.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-primary mb-6">Leave a Review</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating *</label>
                <StarRating rating={formData.rating} onChange={(r) => setFormData({ ...formData, rating: r })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Share your experience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none"
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
