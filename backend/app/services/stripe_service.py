import stripe
from app.config import get_settings


def get_stripe():
    settings = get_settings()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def create_stripe_customer(email: str, name: str) -> str:
    s = get_stripe()
    customer = s.Customer.create(email=email, name=name)
    return customer.id


def create_stripe_invoice(
    customer_id: str,
    line_items: list[dict],
    due_date: int,
) -> dict:
    s = get_stripe()
    invoice = s.Invoice.create(
        customer=customer_id,
        collection_method="send_invoice",
        days_until_due=due_date,
    )
    for item in line_items:
        s.InvoiceItem.create(
            customer=customer_id,
            invoice=invoice.id,
            description=item["description"],
            unit_amount=item["amount_cents"],
            quantity=item.get("quantity", 1),
            currency="usd",
        )
    return {"stripe_invoice_id": invoice.id}


def send_stripe_invoice(stripe_invoice_id: str) -> dict:
    s = get_stripe()
    invoice = s.Invoice.send_invoice(stripe_invoice_id)
    return {"status": invoice.status, "hosted_invoice_url": invoice.hosted_invoice_url}


def get_stripe_invoice(stripe_invoice_id: str) -> dict:
    s = get_stripe()
    invoice = s.Invoice.retrieve(stripe_invoice_id)
    return {
        "status": invoice.status,
        "hosted_invoice_url": invoice.hosted_invoice_url,
        "amount_due": invoice.amount_due,
        "amount_paid": invoice.amount_paid,
    }
