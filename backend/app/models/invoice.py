import secrets
from datetime import datetime


def new_invoice(
    client_id: str,
    amount_cents: int,
    line_items: list[dict],
    due_date: datetime,
    project_id: str | None = None,
    stripe_invoice_id: str = "",
) -> dict:
    return {
        "client_id": client_id,
        "project_id": project_id,
        "stripe_invoice_id": stripe_invoice_id,
        "amount_cents": amount_cents,
        "status": "draft",
        "due_date": due_date,
        "line_items": line_items,
        "token": secrets.token_urlsafe(24),
        "created_at": datetime.utcnow(),
        "paid_at": None,
    }
