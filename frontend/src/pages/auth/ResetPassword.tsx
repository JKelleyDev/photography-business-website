import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Invalid or expired link');
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
          <h1 className="text-3xl md:text-4xl font-serif font-light">Reset password</h1>
        </div>

        <div className="p-8 rounded-lg border border-border bg-card">
          {success ? (
            <p className="text-sm text-foreground leading-relaxed text-center">
              Password reset. Redirecting to sign in...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="border border-destructive/30 bg-destructive/5 text-destructive text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
