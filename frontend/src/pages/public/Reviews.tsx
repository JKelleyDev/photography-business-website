import { useState, useEffect } from 'react';
import api from '../../api/client';
import { Review } from '../../types';
import StarRating from '../../components/ui/StarRating';
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


  const inputClass =
    'w-full px-4 py-3 bg-paper border border-fixer/40 rounded-sm focus:border-ink outline-none text-base';

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="font-serif text-5xl md:text-7xl font-light tracking-[-0.02em] mb-6">Reviews</h1>
          {loading ? (
            <div className="skeleton h-6 w-56" aria-hidden />
          ) : reviews.length > 0 && (
            <div className="flex items-center gap-3">
              <StarRating rating={Math.round(avgRating)} readonly />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} from {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
        </div>

        <div className="mb-16 divide-y divide-tray border-y border-tray" aria-busy={loading}>
          {loading ? (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-3 py-10" aria-hidden>
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-7 w-full" />
                <div className="skeleton h-7 w-4/5" />
              </div>
            ))
          ) : reviews.length === 0 ? (
            <p className="text-muted-foreground py-16">No reviews yet. Worked with us? Write the first one.</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="py-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">{review.author_name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(review.created_at)}</p>
                  </div>
                  <StarRating rating={review.rating} readonly />
                </div>
                <blockquote className="font-serif text-2xl md:text-3xl font-light leading-snug">{review.body}</blockquote>
              </div>
            ))
          )}
        </div>

        <div className="max-w-xl">
          {!showForm ? (
            <div>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center px-10 py-3 rounded-sm bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium"
              >
                Write a review
              </button>
            </div>
          ) : submitted ? (
            <div className="py-12 px-8 border border-tray bg-card">
              <h3 className="text-xl font-serif font-light mb-2">Thanks for the review</h3>
              <p className="text-muted-foreground">It will appear here once it's approved.</p>
            </div>
          ) : (
            <div className="p-8 border border-tray bg-card">
              <h2 className="text-2xl font-serif font-light mb-8">Write a review</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Rating *</label>
                  <StarRating rating={formData.rating} onChange={(r) => setFormData({ ...formData, rating: r })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1.5">Review *</label>
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
                  className="w-full px-6 py-3 rounded-sm bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Post review'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
