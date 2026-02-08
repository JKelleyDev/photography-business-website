import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { Invoice } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/client/invoices').then(({ data }) => {
      const found = data.invoices.find((inv: Invoice) => inv.id === id);
      setInvoice(found || null);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handlePay() {
    const { data } = await api.post(`/client/invoices/${id}/pay`);
    if (data.payment_url) {
      window.location.href = data.payment_url;
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!invoice) return <p className="text-center py-12 text-muted">Invoice not found.</p>;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-primary mb-6">Invoice</h1>
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-3xl font-bold">{formatCurrency(invoice.amount_cents)}</p>
            <p className="text-sm text-muted">Due: {formatDate(invoice.due_date)}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
            invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {invoice.status}
          </span>
        </div>

        <div className="border-t pt-4 space-y-2">
          {invoice.line_items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {item.description} {item.quantity > 1 && `x${item.quantity}`}
              </span>
              <span className="font-medium">{formatCurrency(item.amount_cents * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-t mt-4 pt-4 flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold">{formatCurrency(invoice.amount_cents)}</span>
        </div>

        {invoice.status === 'sent' && (
          <Button onClick={handlePay} className="w-full mt-6" size="lg">
            Pay Now
          </Button>
        )}

        {invoice.status === 'paid' && invoice.paid_at && (
          <p className="text-center text-sm text-green-600 mt-6">Paid on {formatDate(invoice.paid_at)}</p>
        )}
      </div>
    </div>
  );
}
