import crypto from 'crypto';

export function newInvoice(
  clientId: string,
  amountCents: number,
  lineItems: { description: string; amount_cents: number; quantity: number }[],
  dueDate: Date,
  projectId: string | null = null,
  stripeInvoiceId = '',
) {
  return {
    client_id: clientId,
    project_id: projectId,
    stripe_invoice_id: stripeInvoiceId,
    amount_cents: amountCents,
    status: 'draft',
    due_date: dueDate,
    line_items: lineItems,
    token: crypto.randomBytes(24).toString('base64url'),
    created_at: new Date(),
    paid_at: null as Date | null,
  };
}
