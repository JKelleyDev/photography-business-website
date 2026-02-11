import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { Invoice } from '../../types';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface PaymentMethod {
  type: 'venmo' | 'paypal' | 'zelle';
  label: string;
  url?: string;
  info?: string;
}

function buildPaymentMethods(settings: Record<string, string>, amountDollars: string): PaymentMethod[] {
  const methods: PaymentMethod[] = [];

  if (settings.venmo_enabled === 'true' && settings.venmo_username) {
    const username = settings.venmo_username.replace('@', '');
    methods.push({
      type: 'venmo',
      label: 'Pay with Venmo',
      url: `https://venmo.com/${username}?txn=pay&amount=${amountDollars}&note=${encodeURIComponent('MAD Photos Invoice')}`,
    });
  }

  if (settings.paypal_enabled === 'true' && settings.paypal_username) {
    methods.push({
      type: 'paypal',
      label: 'Pay with PayPal',
      url: `https://paypal.me/${settings.paypal_username}/${amountDollars}`,
    });
  }

  if (settings.zelle_enabled === 'true' && settings.zelle_info) {
    methods.push({
      type: 'zelle',
      label: 'Pay with Zelle',
      info: settings.zelle_info,
    });
  }

  return methods;
}

const methodColors: Record<string, string> = {
  venmo: 'bg-[#008CFF] hover:bg-[#0074D4]',
  paypal: 'bg-[#0070BA] hover:bg-[#005EA6]',
  zelle: 'bg-[#6D1ED4] hover:bg-[#5A18B0]',
};

export default function InvoiceView() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/client/invoices').then(({ data }) => {
        const found = data.invoices.find((inv: Invoice) => inv.id === id);
        setInvoice(found || null);
        return found;
      }),
      api.get('/settings').then(({ data }) => {
        const map: Record<string, string> = {};
        for (const s of data.settings) map[s.key] = s.value;
        return map;
      }),
    ]).then(([inv, settings]) => {
      if (inv) {
        const dollars = (inv.amount_cents / 100).toFixed(2);
        setPaymentMethods(buildPaymentMethods(settings, dollars));
      }
    }).finally(() => setLoading(false));
  }, [id]);

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

        {invoice.status === 'sent' && paymentMethods.length > 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-gray-700">Choose a payment method:</p>
            {paymentMethods.map((method) => (
              <div key={method.type}>
                {method.url ? (
                  <a
                    href={method.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full text-center text-white font-semibold py-3 rounded-lg transition-colors ${methodColors[method.type]}`}
                  >
                    {method.label}
                  </a>
                ) : (
                  <div className={`w-full text-center text-white font-semibold py-3 rounded-lg ${methodColors[method.type]}`}>
                    <p>{method.label}</p>
                    <p className="text-sm font-normal mt-1 opacity-90">
                      Send {formatCurrency(invoice.amount_cents)} to: {method.info}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {invoice.status === 'sent' && paymentMethods.length === 0 && (
          <p className="text-center text-sm text-muted mt-6">
            Contact us for payment instructions.
          </p>
        )}

        {invoice.status === 'paid' && invoice.paid_at && (
          <p className="text-center text-sm text-green-600 mt-6">Paid on {formatDate(invoice.paid_at)}</p>
        )}
      </div>
    </div>
  );
}
