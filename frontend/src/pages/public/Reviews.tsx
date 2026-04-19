import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Review } from '../../types';
import StarRating from '../../components/ui/StarRating';
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

  const inputClass =
    'w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-stone/30 focus:border-stone outline-none text-sm';

  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-sm text-muted-foreground mb-2 tracking-widest uppercase">
            Testimonials
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-light mb-6">Reviews</h1>
          {reviews.length > 0 && (
            <div className="flex items-center justify-center gap-3">
              <StarRating rating={Math.round(avgRating)} readonly />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-6 mb-16">
          {reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No reviews yet. Be the first.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="p-8 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{review.author_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(review.created_at)}</p>
                  </div>
                  <StarRating rating={review.rating} readonly />
                </div>
                <p className="text-foreground leading-relaxed">{review.body}</p>
              </div>
            ))
          )}
        </div>

        <div className="max-w-xl mx-auto">
          {!showForm ? (
            <div className="text-center">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center px-10 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium"
              >
                Leave a Review
              </button>
            </div>
          ) : submitted ? (
            <div className="text-center py-16 rounded-lg border border-border bg-card">
              <h3 className="text-xl font-serif font-light mb-2">Thank You</h3>
              <p className="text-muted-foreground">Your review has been submitted and is pending approval.</p>
            </div>
          ) : (
            <div className="p-8 rounded-lg border border-border bg-card">
              <h2 className="text-2xl font-serif font-light mb-8">Leave a Review</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Rating *</label>
                  <StarRating rating={formData.rating} onChange={(r) => setFormData({ ...formData, rating: r })} />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Review *</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Share your experience..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
