import { useState, useEffect } from 'react';
import api from '../../api/client';
import { User } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ClientList() {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', phone: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/clients');
    setClients(data.clients);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await api.post('/admin/clients', form);
    setShowAdd(false);
    setForm({ email: '', name: '', phone: '' });
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Clients</h1>
        <Button onClick={() => setShowAdd(true)}>Add Client</Button>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-3 font-medium">{client.name || '—'}</td>
                <td className="px-4 py-3 text-muted">{client.email}</td>
                <td className="px-4 py-3 text-muted hidden sm:table-cell">{client.phone || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {client.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Client">
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-muted">An invite email will be sent to set their password.</p>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <Button type="submit" className="w-full">Create & Send Invite</Button>
        </form>
      </Modal>
    </div>
  );
}
