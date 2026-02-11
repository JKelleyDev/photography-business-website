import { useState, useEffect } from 'react';
import api from '../../api/client';
import { PricingPackage } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const emptyForm = { name: '', description: '', price_dollars: '', price_display: '', features: '', is_custom: false };

export default function PricingManager() {
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/pricing');
    setPackages(data.packages);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(pkg: PricingPackage) {
    setEditingId(pkg.id);
    setForm({
      name: pkg.name,
      description: pkg.description,
      price_dollars: (pkg.price_cents / 100).toFixed(2),
      price_display: pkg.price_display || '',
      features: pkg.features.join('\n'),
      is_custom: pkg.is_custom,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = Math.round(parseFloat(form.price_dollars || '0') * 100);
    const payload = {
      name: form.name,
      description: form.description,
      price_cents: priceCents,
      price_display: form.price_display,
      features: form.features.split('\n').filter(Boolean),
      is_custom: form.is_custom,
    };
    if (editingId) {
      await api.put(`/admin/pricing/${editingId}`, payload);
    } else {
      await api.post('/admin/pricing', payload);
    }
    closeForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this package?')) return;
    await api.delete(`/admin/pricing/${id}`);
    load();
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Pricing Packages</h1>
        <Button onClick={openCreate}>Add Package</Button>
      </div>

      <div className="space-y-4">
        {packages.map((pkg) => (
          <div key={pkg.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{pkg.name}</h3>
              <p className="text-sm text-muted">{pkg.is_custom ? 'Custom Quote' : pkg.price_display || formatCurrency(pkg.price_cents)}</p>
              <p className="text-xs text-muted mt-1">{pkg.features.length} features</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => openEdit(pkg)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(pkg.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={closeForm} title={editingId ? 'Edit Package' : 'Add Pricing Package'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Price ($)</label>
              <input type="number" step="0.01" min="0" placeholder="500.00" value={form.price_dollars} onChange={(e) => setForm({ ...form, price_dollars: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Price</label>
              <input type="text" placeholder="Starting at $500" value={form.price_display} onChange={(e) => setForm({ ...form, price_display: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Features (one per line)</label>
            <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} rows={4} placeholder="2 hour session&#10;50 edited photos&#10;Online gallery" className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent resize-none" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_custom} onChange={(e) => setForm({ ...form, is_custom: e.target.checked })} />
            Custom quote (hide price, show "Contact for pricing")
          </label>
          <Button type="submit" className="w-full">{editingId ? 'Save Changes' : 'Create Package'}</Button>
        </form>
      </Modal>
    </div>
  );
}
