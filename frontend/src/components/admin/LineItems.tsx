import { Plus, X } from 'lucide-react';
import { Button, Input, Label } from './ui';

export interface LineItem { description: string; amount_dollars: string; quantity: number }
export const emptyLine = (): LineItem => ({ description: '', amount_dollars: '', quantity: 1 });
export const lineTotal = (items: LineItem[]) =>
  items.reduce((sum, li) => sum + parseFloat(li.amount_dollars || '0') * li.quantity, 0);

/** Invoice line-item editor. Stacks description over amount/qty on phones. */
export default function LineItems({ items, onChange }: { items: LineItem[]; onChange: (v: LineItem[]) => void }) {
  const update = (i: number, patch: Partial<LineItem>) => onChange(items.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));

  return (
    <div>
      <Label>Line items</Label>
      <div className="mt-2 hidden grid-cols-[1fr_8rem_5rem_2.5rem] gap-2 text-xs text-fixer sm:grid">
        <span>Description</span><span>Amount ($)</span><span>Qty</span><span />
      </div>
      <ul className="mt-2 space-y-3 sm:space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="grid grid-cols-[1fr_5rem_2.5rem] gap-2 rounded-md border border-line p-2 sm:grid-cols-[1fr_8rem_5rem_2.5rem] sm:border-0 sm:p-0">
            <Input aria-label="Description" placeholder="Description" required value={item.description}
              onChange={(e) => update(idx, { description: e.target.value })} className="col-span-3 sm:col-span-1" />
            <Input aria-label="Amount in dollars" type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" required
              value={item.amount_dollars} onChange={(e) => update(idx, { amount_dollars: e.target.value })} />
            <Input aria-label="Quantity" type="number" inputMode="numeric" min={1} value={item.quantity}
              onChange={(e) => update(idx, { quantity: Number(e.target.value) })} />
            <Button variant="ghost" size="icon" aria-label="Remove line item" disabled={items.length === 1}
              onClick={() => onChange(items.filter((_, i) => i !== idx))}><X /></Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => onChange([...items, emptyLine()])}><Plus /> Add line item</Button>
        <p className="text-sm">Total <span className="ml-2 text-lg font-semibold tabular-nums">${lineTotal(items).toFixed(2)}</span></p>
      </div>
    </div>
  );
}
