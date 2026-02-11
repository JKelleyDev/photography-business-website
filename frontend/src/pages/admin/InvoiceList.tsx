import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Invoice, User } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-700',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-primary">Invoices</h1>
        <Link to="/admin/invoices/new">
          <Button>Create Invoice</Button>
        </Link>
      </div>
      <div className="space-y-3">
        {invoices.length === 0 ? (
          <p className="text-muted text-center py-12">No invoices yet.</p>
        ) : (
          invoices.map((inv) => {
            const client = clients[inv.client_id];
            return (
              <div key={inv.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{formatCurrency(inv.amount_cents)}</p>
                    {client && <p className="text-sm text-muted">{client.name} ({client.email})</p>}
                    <p className="text-sm text-muted">Due: {formatDate(inv.due_date)}</p>
                    <p className="text-xs text-muted">{inv.line_items.length} item(s)</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[inv.status]}`}>
                    {inv.status}
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
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => copyInvoiceLink(inv)}
                    >
                      {copiedId === inv.id ? 'Copied!' : 'Copy Link'}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      title="Email & text sending coming soon"
                    >
                      Send to Client
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
