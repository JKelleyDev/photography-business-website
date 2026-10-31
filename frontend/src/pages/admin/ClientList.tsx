import { useState, useEffect } from 'react';
import { Search, UserPlus, Users } from 'lucide-react';
import api from '../../api/client';
import { User } from '../../types';
import {
  Badge, Button, Dialog, EmptyState, Field, Input, List, ListSkeleton, PageHeader, Select, Toolbar,
} from '../../components/admin/ui';

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

export default function ClientList() {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', phone: '' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'newest' | 'oldest'>('newest');

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/clients');
    setClients(data.clients);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/admin/clients', form);
      setShowAdd(false);
      setForm({ email: '', name: '', phone: '' });
      load();
    } finally {
      setSaving(false);
    }
  }

  const filtered = clients
    .filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      const diff = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      return sortBy === 'newest' ? -diff : diff;
    });

  const addBtn = <Button onClick={() => setShowAdd(true)}><UserPlus /> Add client</Button>;

  return (
    <div>
      <PageHeader title="Clients" description="People with an account for galleries and invoices." actions={addBtn} />

      <Toolbar>
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fixer" />
          <Input type="search" aria-label="Search clients" placeholder="Search name, email or phone"
            value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="sm:w-40">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
        </Select>
      </Toolbar>

      {loading ? <ListSkeleton /> : filtered.length === 0 ? (
        <EmptyState icon={<Users />} title={search ? 'No matching clients' : 'No clients yet'} action={search ? undefined : addBtn}>
          {search ? 'Check the spelling, or search by email instead.' : 'Add a client and they’ll get an email to set their password.'}
        </EmptyState>
      ) : (
        <List>
          <div className="hidden grid-cols-[1fr_1fr_10rem_6rem] gap-4 bg-wash px-5 py-2.5 text-xs font-medium text-fixer md:grid">
            <span>Name</span><span>Email</span><span>Phone</span><span>Status</span>
          </div>
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3 md:grid md:grid-cols-[1fr_1fr_10rem_6rem] md:gap-4 md:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-wash text-xs font-semibold text-fixer">{initials(c.name || c.email)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name || 'No name'}</p>
                  <a href={`mailto:${c.email}`} className="block truncate text-[13px] text-fixer hover:text-ink md:hidden">{c.email}</a>
                </div>
              </div>
              <a href={`mailto:${c.email}`} className="hidden truncate text-sm text-fixer hover:text-ink md:block">{c.email}</a>
              <span className="hidden text-sm text-fixer md:block">
                {c.phone ? <a href={`tel:${c.phone}`} className="hover:text-ink">{c.phone}</a> : '—'}
              </span>
              <span className="ml-auto md:ml-0">
                <Badge tone={c.is_active ? 'success' : 'outline'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
              </span>
            </div>
          ))}
        </List>
      )}

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add client"
        description="We’ll email them a link to set their password.">
        <form id="add-client" onSubmit={handleCreate} className="space-y-4">
          <Field label="Name">{(id) => <Input id={id} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}</Field>
          <Field label="Phone (optional)">{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Sending invite…' : 'Add and send invite'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
