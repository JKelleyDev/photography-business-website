import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { User } from '../../types';
import Button from '../../components/ui/Button';

interface LineItem {
  description: string;
  amount_cents: number;
  quantity: number;
}

export default function InvoiceCreate() {
  const [clients, setClients] = useState<User[]>([]);
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', amount_cents: 0, quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/admin/clients').then(({ data }) => setClients(data.clients));
  }, []);

  function addLineItem() {
    setLineItems([...lineItems, { description: '', amount_cents: 0, quantity: 1 }]);
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  }

  function removeLineItem(index: number) {
    setLineItems(lineItems.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/invoices', {
        client_id: clientId,
        line_items: lineItems,
        due_date: new Date(dueDate).toISOString(),
      });
      navigate('/admin/invoices');
    } catch (err) {
      console.error('Failed to create invoice', err);
    } finally {
      setSubmitting(false);
    }
  }

  const total = lineItems.reduce((sum, li) => sum + li.amount_cents * li.quantity, 0);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-primary mb-6">Create Invoice</h1>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Client *</label>
          <select required value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent">
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Due Date *</label>
          <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Line Items</label>
          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <input type="text" placeholder="Description" required value={item.description} onChange={(e) => updateLineItem(idx, 'description', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm" />
                <input type="number" placeholder="Amount (cents)" required value={item.amount_cents || ''} onChange={(e) => updateLineItem(idx, 'amount_cents', Number(e.target.value))} className="w-28 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm" />
                <input type="number" min={1} value={item.quantity} onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))} className="w-16 px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-accent text-sm" />
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700 p-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addLineItem} className="mt-2 text-sm text-accent hover:underline">+ Add line item</button>
        </div>

        <div className="border-t pt-4 text-right">
          <p className="text-lg font-bold">Total: ${(total / 100).toFixed(2)}</p>
        </div>

        <Button type="submit" disabled={submitting} className="w-full" size="lg">
          {submitting ? 'Creating...' : 'Create Invoice'}
        </Button>
      </form>
    </div>
  );
}
