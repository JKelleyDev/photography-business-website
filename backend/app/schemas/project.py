from datetime import datetime
from pydantic import BaseModel


class CreateProjectRequest(BaseModel):
    title: str
    description: str = ""
    client_email: str
    client_name: str = ""
    categories: list[str] = []
    inquiry_id: str | None = None


class UpdateProjectRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    categories: list[str] | None = None
    cover_image_key: str | None = None


class DeliverLineItem(BaseModel):
    description: str
    amount_cents: int
    quantity: int = 1


class DeliverProjectRequest(BaseModel):
    share_link_expires_at: datetime | None = None
    project_expires_at: datetime | None = None
    create_invoice: bool = False
    invoice_line_items: list[DeliverLineItem] | None = None
    invoice_due_date: datetime | None = None


class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    client_id: str
    status: str
    cover_image_key: str | None
    categories: list[str]
    share_link_token: str | None
    share_link_expires_at: datetime | None
    project_expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
