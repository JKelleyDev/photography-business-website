import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Button from '../../components/ui/Button';

export default function SetPassword() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    try {
      await api.post('/auth/set-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch {
      setError('Invalid or expired link');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-primary mb-6">Set Your Password</h1>
        {success ? (
          <p className="text-green-600">Password set! Redirecting to login...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <Button type="submit" className="w-full" size="lg">Set Password</Button>
          </form>
        )}
      </div>
    </div>
  );
}
