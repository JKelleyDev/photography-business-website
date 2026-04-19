import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-stone/30 focus:border-stone outline-none text-sm';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6 py-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link to="/" className="inline-block text-lg font-medium tracking-tight mb-6">
            MAD <span className="text-muted-foreground">Photography</span>
          </Link>
          <p className="text-sm text-muted-foreground mb-2 tracking-widest uppercase">
            Account Recovery
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-light">Forgot password</h1>
        </div>

        <div className="p-8 rounded-lg border border-border bg-card">
          {sent ? (
            <p className="text-sm text-foreground leading-relaxed text-center">
              If an account exists with that email, a reset link has been sent.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
          <div className="mt-6 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
