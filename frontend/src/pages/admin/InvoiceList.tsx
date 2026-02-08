import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Invoice } from '../../types';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await api.get('/admin/invoices');
    setInvoices(data.invoices);
    setLoading(false);
  }

  async function sendInvoice(id: string) {
    await api.put(`/admin/invoices/${id}/send`);
    load();
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
          invoices.map((inv) => (
            <div key={inv.id} className="bg-white border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold">{formatCurrency(inv.amount_cents)}</p>
                <p className="text-sm text-muted">Due: {formatDate(inv.due_date)}</p>
                <p className="text-xs text-muted">{inv.line_items.length} item(s)</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[inv.status]}`}>
                  {inv.status}
                </span>
                {inv.status === 'draft' && (
                  <Button size="sm" onClick={() => sendInvoice(inv.id)}>Send</Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
