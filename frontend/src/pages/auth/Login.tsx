import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const token = localStorage.getItem('access_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        navigate(payload.role === 'admin' ? '/admin' : '/client');
      }
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
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
            Welcome Back
          </p>
          <h1 className="text-3xl md:text-4xl font-serif font-light">Sign in</h1>
        </div>

        <div className="p-8 rounded-lg border border-border bg-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="border border-destructive/30 bg-destructive/5 text-destructive text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
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
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Back to Home
            </Link>
            <span className="text-border">|</span>
            <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
