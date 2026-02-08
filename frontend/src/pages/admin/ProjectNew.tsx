import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import Button from '../../components/ui/Button';

export default function ProjectNew() {
  const [form, setForm] = useState({ title: '', description: '', client_email: '', client_name: '', categories: '' });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post('/admin/projects', {
        ...form,
        categories: form.categories.split(',').map((c) => c.trim()).filter(Boolean),
      });
      navigate(`/admin/projects/${data.id}`);
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-primary mb-6">New Project</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project Title *</label>
          <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client Email *</label>
          <input type="email" required value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" placeholder="client@example.com" />
          <p className="text-xs text-muted mt-1">If this client doesn't have an account, one will be created automatically.</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Client Name</label>
          <input type="text" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Categories (comma separated)</label>
          <input type="text" value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" placeholder="Wedding, Reception, Getting Ready" />
        </div>
        <Button type="submit" disabled={submitting} className="w-full" size="lg">
          {submitting ? 'Creating...' : 'Create Project'}
        </Button>
      </form>
    </div>
  );
}
