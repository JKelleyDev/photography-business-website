import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Invoice, User } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'paid', 'void'] as const;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getInvoiceUrgency(inv: Invoice): 'overdue' | 'due-soon' | null {
  if (inv.status === 'paid' || inv.status === 'void' || inv.status === 'draft') return null;
  const due = new Date(inv.due_date).getTime();
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;
  if (due < now) return 'overdue';
  if (due - now <= threeDays) return 'due-soon';
  return null;
}

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  useEffect(() => { load(); }, []);

  async function load() {
    const [invRes, clientRes] = await Promise.all([
      api.get('/admin/invoices'),
      api.get('/admin/clients'),
    ]);
    setInvoices(invRes.data.invoices);
    const clientMap: Record<string, User> = {};
    for (const c of clientRes.data.clients) clientMap[c.id] = c;
    setClients(clientMap);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    await api.put(`/admin/invoices/${id}/status`, { status });
    load();
  }

  function copyInvoiceLink(inv: Invoice) {
    const url = `${window.location.origin}/invoice/${inv.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(inv.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const years = [...new Set(invoices.map((inv) => new Date(inv.created_at).getFullYear().toString()))].sort((a, b) => +b - +a);

  const filtered = invoices
    .filter((inv) => statusFilter === 'all' || inv.status === statusFilter)
    .filter((inv) => {
      if (yearFilter === 'all') return true;
      return new Date(inv.created_at).getFullYear().toString() === yearFilter;
    })
    .filter((inv) => {
      if (monthFilter === 'all') return true;
      return new Date(inv.created_at).getMonth().toString() === monthFilter;
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Invoices</h1>
        <Link to="/admin/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                statusFilter === s ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <select
          value={yearFilter}
          onChange={(e) => { setYearFilter(e.target.value); setMonthFilter('all'); }}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="all">All years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        {yearFilter !== 'all' && (
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="all">All months</option>
            {MONTHS.map((m, i) => <option key={i} value={i.toString()}>{m}</option>)}
          </select>
        )}
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'desc' | 'asc')}
          className="text-sm border rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-muted text-center py-12">No invoices found.</p>
        ) : (
          filtered.map((inv) => {
            const client = clients[inv.client_id];
            const urgency = getInvoiceUrgency(inv);
            const borderClass =
              urgency === 'overdue' ? 'border-red-300 bg-red-50/40' :
              urgency === 'due-soon' ? 'border-yellow-300 bg-yellow-50/40' :
              'border-gray-200 bg-white';
            const statusBadge =
              urgency === 'overdue' ? 'bg-red-100 text-red-700' :
              urgency === 'due-soon' ? 'bg-yellow-100 text-yellow-700' :
              inv.status === 'paid' ? 'bg-green-100 text-green-700' :
              inv.status === 'void' ? 'bg-gray-100 text-gray-500' :
              inv.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              'bg-blue-100 text-blue-700';

            return (
              <div key={inv.id} className={`border rounded-lg p-4 ${borderClass}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{formatCurrency(inv.amount_cents)}</p>
                    {client && <p className="text-sm text-muted">{client.name} ({client.email})</p>}
                    <p className={`text-sm ${urgency === 'overdue' ? 'text-red-600 font-medium' : urgency === 'due-soon' ? 'text-yellow-600 font-medium' : 'text-muted'}`}>
                      Due: {formatDate(inv.due_date)}
                      {urgency === 'overdue' && ' — Overdue'}
                      {urgency === 'due-soon' && ' — Due Soon'}
                    </p>
                    <p className="text-xs text-muted">{inv.line_items.length} item(s)</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge}`}>
                    {urgency === 'overdue' ? 'Overdue' : urgency === 'due-soon' ? 'Due Soon' : inv.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {['draft', 'sent', 'paid', 'void'].map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={inv.status === s ? 'primary' : 'ghost'}
                      onClick={() => updateStatus(inv.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                  <div className="border-l pl-2 ml-1 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => copyInvoiceLink(inv)}>
                      {copiedId === inv.id ? 'Copied!' : 'Copy Link'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
