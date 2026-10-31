import { useState, useEffect } from 'react';
import { Eye, EyeOff, Pencil, Plus, Tag, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { PricingPackage } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  Badge, Button, Checkbox, Dialog, EmptyState, Field, Input, List, ListSkeleton, PageHeader, Textarea, cn,
} from '../../components/admin/ui';

const emptyForm = { name: '', description: '', price_dollars: '', price_display: '', features: '', is_custom: false };

export default function PricingManager() {
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      price_cents: Math.round(parseFloat(form.price_dollars || '0') * 100),
      price_display: form.price_display,
      features: form.features.split('\n').filter(Boolean),
      is_custom: form.is_custom,
    };
    try {
      if (editingId) await api.put(`/admin/pricing/${editingId}`, payload);
      else await api.post('/admin/pricing', payload);
      closeForm();
      load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this package? This can’t be undone.')) return;
    await api.delete(`/admin/pricing/${id}`);
    load();
  }

  async function toggleVisible(pkg: PricingPackage) {
    setPackages((prev) => prev.map((p) => (p.id === pkg.id ? { ...p, is_visible: !p.is_visible } : p)));
    await api.put(`/admin/pricing/${pkg.id}`, { is_visible: !pkg.is_visible });
    load();
  }

  const addBtn = <Button onClick={openCreate}><Plus /> Add package</Button>;

  return (
    <div>
      <PageHeader title="Pricing" description="Packages shown on the public pricing page, in this order." actions={addBtn} />

      {loading ? <ListSkeleton rows={3} /> : packages.length === 0 ? (
        <EmptyState icon={<Tag />} title="No packages yet" action={addBtn}>
          Add a package so visitors can book from the pricing page.
        </EmptyState>
      ) : (
        <List>
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className={cn('min-w-0 flex-1', !pkg.is_visible && 'opacity-60')}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{pkg.name}</p>
                  {!pkg.is_visible && <Badge tone="outline">Hidden</Badge>}
                </div>
                <p className="mt-0.5 text-[13px] text-fixer">
                  {pkg.is_custom ? 'Custom quote' : pkg.price_display || formatCurrency(pkg.price_cents)}
                  {' — '}{pkg.features.length} {pkg.features.length === 1 ? 'feature' : 'features'}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => toggleVisible(pkg)}
                  aria-label={pkg.is_visible ? `Hide ${pkg.name}` : `Show ${pkg.name}`} title={pkg.is_visible ? 'Hide from website' : 'Show on website'}>
                  {pkg.is_visible ? <Eye /> : <EyeOff />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(pkg)} aria-label={`Edit ${pkg.name}`}><Pencil /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(pkg.id)} aria-label={`Delete ${pkg.name}`} className="text-safelight hover:bg-red-50"><Trash2 /></Button>
              </div>
            </div>
          ))}
        </List>
      )}

      <Dialog open={showForm} onClose={closeForm} title={editingId ? 'Edit package' : 'Add package'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">{(id) => <Input id={id} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Description">{(id) => <Textarea id={id} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />}</Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price ($)">{(id) => <Input id={id} type="number" inputMode="decimal" step="0.01" min="0" placeholder="500.00" value={form.price_dollars} onChange={(e) => setForm({ ...form, price_dollars: e.target.value })} />}</Field>
            <Field label="Price shown on website" hint="Optional. Overrides the number.">{(id) => <Input id={id} placeholder="Starting at $500" value={form.price_display} onChange={(e) => setForm({ ...form, price_display: e.target.value })} />}</Field>
          </div>
          <Field label="What's included" hint="One item per line.">{(id) => <Textarea id={id} rows={4} placeholder={'2 hour session\n50 edited photos\nOnline gallery'} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />}</Field>
          <Checkbox checked={form.is_custom} onChange={(v) => setForm({ ...form, is_custom: v })}>
            Custom quote <span className="text-fixer">(hides the price and shows “Request a quote”)</span>
          </Checkbox>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add package'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
