from datetime import datetime
from pydantic import BaseModel


class LineItem(BaseModel):
    description: str
    amount_cents: int
    quantity: int = 1


class CreateInvoiceRequest(BaseModel):
    client_id: str
    project_id: str | None = None
    line_items: list[LineItem]
    due_date: datetime


class InvoiceResponse(BaseModel):
    id: str
    client_id: str
    project_id: str | None
    stripe_invoice_id: str
    amount_cents: int
    status: str
    due_date: datetime
    line_items: list[dict]
    token: str = ""
    created_at: datetime
    paid_at: datetime | None


class PublicInvoiceResponse(BaseModel):
    amount_cents: int
    status: str
    due_date: datetime
    line_items: list[dict]
    paid_at: datetime | None
    business_name: str = ""
