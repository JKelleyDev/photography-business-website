from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.invoice import CreateInvoiceRequest, InvoiceResponse
from app.models.invoice import new_invoice

router = APIRouter()


@router.get("")
async def list_invoices(admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.invoices.find().sort("created_at", -1)
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
            token=inv.get("token", ""),
            paid_at=inv.get("paid_at"),
        ))
    return {"invoices": items}


@router.post("", status_code=201)
async def create_invoice_endpoint(body: CreateInvoiceRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    client = await db.users.find_one({"_id": ObjectId(body.client_id), "role": "client"})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    total_cents = sum(item.amount_cents * item.quantity for item in body.line_items)
    line_items_dicts = [li.model_dump() for li in body.line_items]
    invoice = new_invoice(
        client_id=body.client_id,
        amount_cents=total_cents,
        line_items=line_items_dicts,
        due_date=body.due_date,
        project_id=body.project_id,
    )
    result = await db.invoices.insert_one(invoice)
    return {"id": str(result.inserted_id), "message": "Invoice created"}


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    inv = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceResponse(
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
    )


@router.put("/{invoice_id}/status")
async def update_invoice_status(invoice_id: str, body: dict, admin: dict = Depends(require_admin)):
    db = get_database()
    new_status = body.get("status")
    valid_statuses = ["draft", "sent", "paid", "void"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    update: dict = {"status": new_status}
    if new_status == "paid":
        update["paid_at"] = datetime.utcnow()
    result = await db.invoices.update_one({"_id": ObjectId(invoice_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"message": f"Invoice marked as {new_status}"}
