from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_client
from app.schemas.invoice import InvoiceResponse
from app.services.stripe_service import get_stripe_invoice

router = APIRouter()


@router.get("")
async def list_my_invoices(user: dict = Depends(require_client)):
    db = get_database()
    cursor = db.invoices.find({"client_id": user["_id"]}).sort("created_at", -1)
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


@router.post("/{invoice_id}/pay")
async def pay_invoice(invoice_id: str, user: dict = Depends(require_client)):
    db = get_database()
    inv = await db.invoices.find_one({"_id": ObjectId(invoice_id), "client_id": user["_id"]})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not inv.get("stripe_invoice_id"):
        raise HTTPException(status_code=400, detail="No payment link available")
    stripe_info = get_stripe_invoice(inv["stripe_invoice_id"])
    return {"payment_url": stripe_info.get("hosted_invoice_url")}
