from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth import require_client
from app.schemas.invoice import InvoiceResponse

router = APIRouter()


@router.get("")
async def list_my_invoices(user: dict = Depends(require_client)):
    db = get_database()
    cursor = db.invoices.find({"client_id": str(user["_id"])}).sort("created_at", -1)
    items = []
    async for inv in cursor:
        items.append(InvoiceResponse(
            id=str(inv["_id"]),
            client_id=str(inv["client_id"]),
            project_id=inv.get("project_id"),
            stripe_invoice_id=inv.get("stripe_invoice_id", ""),
            amount_cents=inv["amount_cents"],
            status=inv["status"],
            due_date=inv["due_date"],
            line_items=inv["line_items"],
            created_at=inv["created_at"],
            paid_at=inv.get("paid_at"),
        ))
    return {"invoices": items}
