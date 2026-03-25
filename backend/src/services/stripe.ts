import Stripe from 'stripe';
import { config } from '../config';

function getStripe(): Stripe {
  return new Stripe(config.STRIPE_SECRET_KEY);
}

export async function createStripeCustomer(email: string, name: string): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({ email, name });
  return customer.id;
}

export async function createStripeInvoice(
  customerId: string,
  lineItems: { description: string; amount_cents: number; quantity: number }[],
  daysUntilDue: number,
): Promise<{ stripe_invoice_id: string }> {
  const stripe = getStripe();
  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: daysUntilDue,
  });
  for (const item of lineItems) {
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      description: item.description,
      unit_amount: item.amount_cents,
      quantity: item.quantity,
      currency: 'usd',
    });
  }
  return { stripe_invoice_id: invoice.id };
}

export async function sendStripeInvoice(stripeInvoiceId: string): Promise<{ status: string; hosted_invoice_url: string }> {
  const stripe = getStripe();
  const invoice = await stripe.invoices.sendInvoice(stripeInvoiceId);
  return { status: invoice.status ?? '', hosted_invoice_url: invoice.hosted_invoice_url ?? '' };
}

export async function getStripeInvoice(stripeInvoiceId: string): Promise<{
  status: string;
  hosted_invoice_url: string;
  amount_due: number;
  amount_paid: number;
}> {
  const stripe = getStripe();
  const invoice = await stripe.invoices.retrieve(stripeInvoiceId);
  return {
    status: invoice.status ?? '',
    hosted_invoice_url: invoice.hosted_invoice_url ?? '',
    amount_due: invoice.amount_due,
    amount_paid: invoice.amount_paid,
  };
}
