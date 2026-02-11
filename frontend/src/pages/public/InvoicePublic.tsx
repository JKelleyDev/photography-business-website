import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/dateHelpers';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface PublicInvoice {
  amount_cents: number;
  status: string;
  due_date: string;
  line_items: { description: string; amount_cents: number; quantity: number }[];
  paid_at?: string;
  business_name: string;
}

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

export default function InvoicePublic() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/invoice/${token}`).then(({ data }) => data).catch(() => null),
      api.get('/settings').then(({ data }) => {
        const map: Record<string, string> = {};
        for (const s of data.settings) map[s.key] = s.value;
        return map;
      }).catch(() => ({})),
    ]).then(([inv, settings]) => {
      if (!inv) {
        setNotFound(true);
      } else {
        setInvoice(inv);
        const dollars = (inv.amount_cents / 100).toFixed(2);
        setPaymentMethods(buildPaymentMethods(settings, dollars));
      }
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingSpinner />;
  if (notFound || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h1>
          <p className="text-gray-500">This invoice link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (invoice.status === 'draft') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mb-6">
            <svg className="w-20 h-20 mx-auto text-accent animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{invoice.business_name || 'MAD Photos'}</h1>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Your invoice is being prepared</h2>
          <p className="text-gray-500 text-sm">
            We&apos;re still putting the finishing touches on your invoice. You&apos;ll be able to view and pay it here once it&apos;s ready.
          </p>
          <div className="mt-8 flex justify-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            <span className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{invoice.business_name || 'MAD Photos'}</h1>
          <p className="text-gray-500 text-sm">Invoice</p>
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(invoice.amount_cents)}</p>
              <p className="text-sm text-gray-500">Due: {formatDate(invoice.due_date)}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
              invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
              invoice.status === 'void' ? 'bg-red-100 text-red-700' :
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
            <p className="text-center text-sm text-gray-500 mt-6">
              Contact us for payment instructions.
            </p>
          )}

          {invoice.status === 'paid' && invoice.paid_at && (
            <p className="text-center text-sm text-green-600 mt-6">Paid on {formatDate(invoice.paid_at)}</p>
          )}

          {invoice.status === 'void' && (
            <p className="text-center text-sm text-red-600 mt-6">This invoice has been voided.</p>
          )}
        </div>
      </div>
    </div>
  );
}
