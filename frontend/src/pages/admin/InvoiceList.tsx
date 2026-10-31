import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Plus, Receipt } from 'lucide-react';
import api from '../../api/client';
import { Invoice, User } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import {
  Badge, Button, EmptyState, ListSkeleton, PageHeader, Segmented, Select, STATUS_TONE, Toolbar, buttonClass, cap, cn,
} from '../../components/admin/ui';

const STATUSES = ['draft', 'sent', 'paid', 'void'] as const;
const STATUS_FILTERS = ['all', ...STATUSES] as const;
type Filter = (typeof STATUS_FILTERS)[number];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getInvoiceUrgency(inv: Invoice): 'overdue' | 'due soon' | null {
  if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'draft') return null;
  const due = new Date(inv.due_date).getTime();
  const now = Date.now();
  if (due < now) return 'overdue';
  if (due - now <= 3 * 864e5) return 'due soon';
  return null;
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Filter>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => { load(); }, []);

  async function load() {
    const [invRes, clientRes] = await Promise.all([api.get('/admin/invoices'), api.get('/admin/clients')]);
    setInvoices(invRes.data.invoices);
    const clientMap: Record<string, User> = {};
    for (const c of clientRes.data.clients) clientMap[c.id] = c;
    setClients(clientMap);
    setLoading(false);
  }

  async function updateStatus(id: string, status: Invoice['status']) {
    setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
    await api.put(`/admin/invoices/${id}/status`, { status });
    load();
  }

  function copyInvoiceLink(inv: Invoice) {
    navigator.clipboard.writeText(`${window.location.origin}/invoice/${inv.token}`);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const years = [...new Set(invoices.map((inv) => new Date(inv.created_at).getFullYear().toString()))].sort((a, b) => +b - +a);
  const filtered = invoices
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
    .filter((inv) => yearFilter === 'all' || new Date(inv.created_at).getFullYear().toString() === yearFilter)
    .filter((inv) => monthFilter === 'all' || new Date(inv.created_at).getMonth().toString() === monthFilter)
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

  const outstanding = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.amount_cents, 0);
  const newBtn = <Link to="/admin/invoices/new" className={buttonClass()}><Plus /> New invoice</Link>;

  return (
    <div>
      <PageHeader title="Invoices"
        description={!loading && outstanding > 0 ? `${formatCurrency(outstanding)} waiting to be paid.` : 'Bills you’ve sent to clients.'}
        actions={newBtn} />

      <Toolbar>
        <Segmented label="Filter by status" value={statusFilter} onChange={setStatusFilter} options={STATUS_FILTERS} />
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Select aria-label="Year" value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setMonthFilter('all'); }} className="sm:w-32">
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select aria-label="Month" value={monthFilter} disabled={yearFilter === 'all'} onChange={(e) => setMonthFilter(e.target.value)} className="sm:w-32">
            <option value="all">All months</option>
            {MONTHS.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
          </Select>
          <Select aria-label="Sort" value={sortDir} onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')} className="sm:w-36">
            <option value="desc">Newest</option>
            <option value="asc">Oldest</option>
          </Select>
        </div>
      </Toolbar>

      {loading ? <ListSkeleton /> : filtered.length === 0 ? (
        <EmptyState icon={<Receipt />} title={invoices.length ? 'No invoices match' : 'No invoices yet'} action={invoices.length ? undefined : newBtn}>
          {invoices.length ? 'Try a different status or date.' : 'Create one here, or when you deliver a project.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {filtered.map((inv) => {
            const client = clients[inv.client_id];
            const urgency = getInvoiceUrgency(inv);
            const shown = urgency ?? inv.status;
            return (
              <li key={inv.id} className={cn('rounded-lg border bg-white', urgency === 'overdue' ? 'border-red-200' : 'border-line')}>
                <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tabular-nums tracking-tight">{formatCurrency(inv.amount_cents)}</p>
                    {client && <p className="truncate text-sm">{client.name} <span className="text-fixer">({client.email})</span></p>}
                    <p className={cn('mt-0.5 text-[13px]', urgency === 'overdue' ? 'font-medium text-safelight' : 'text-fixer')}>
                      Due {formatDate(inv.due_date)} — {inv.line_items.length} {inv.line_items.length === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[shown]}>{cap(shown)}</Badge>
                </div>
                <div className="mt-4 flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="inline-flex self-start rounded-md border border-line p-0.5" role="radiogroup" aria-label="Invoice status">
                    {STATUSES.map((s) => (
                      <button key={s} role="radio" aria-checked={inv.status === s} onClick={() => updateStatus(inv.id, s)}
                        className={cn('h-8 rounded-[5px] px-3 text-[13px] font-medium transition-colors',
                          inv.status === s ? 'bg-ink text-white' : 'text-fixer hover:bg-wash hover:text-ink')}>
                        {s === 'paid' ? 'Paid' : s === 'void' ? 'Void' : cap(s)}
                      </button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyInvoiceLink(inv)}>
                    {copiedId === inv.id ? <><Check /> Link copied</> : <><Copy /> Copy payment link</>}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
