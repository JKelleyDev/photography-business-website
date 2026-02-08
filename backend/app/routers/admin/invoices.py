from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.invoice import CreateInvoiceRequest, InvoiceResponse
from app.models.invoice import new_invoice
from app.services.stripe_service import create_stripe_customer, create_stripe_invoice, send_stripe_invoice

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
            paid_at=inv.get("paid_at"),
        ))
    return {"invoices": items}


@router.post("", status_code=201)
async def create_invoice_endpoint(body: CreateInvoiceRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    client = await db.users.find_one({"_id": ObjectId(body.client_id), "role": "client"})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    # Get or create Stripe customer
    stripe_customer_id = client.get("stripe_customer_id")
    if not stripe_customer_id:
        stripe_customer_id = create_stripe_customer(client["email"], client.get("name", ""))
        await db.users.update_one(
            {"_id": client["_id"]},
            {"$set": {"stripe_customer_id": stripe_customer_id}},
        )
    total_cents = sum(item.amount_cents * item.quantity for item in body.line_items)
    line_items_dicts = [li.model_dump() for li in body.line_items]
    # Create Stripe invoice
    days_until_due = max(1, (body.due_date - body.due_date.__class__.utcnow()).days) if hasattr(body.due_date, 'utcnow') else 30
    stripe_result = create_stripe_invoice(stripe_customer_id, line_items_dicts, days_until_due)
    invoice = new_invoice(
        client_id=body.client_id,
        amount_cents=total_cents,
        line_items=line_items_dicts,
        due_date=body.due_date,
        project_id=body.project_id,
        stripe_invoice_id=stripe_result["stripe_invoice_id"],
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


@router.put("/{invoice_id}/send")
async def send_invoice(invoice_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    inv = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if not inv.get("stripe_invoice_id"):
        raise HTTPException(status_code=400, detail="No Stripe invoice associated")
    result = send_stripe_invoice(inv["stripe_invoice_id"])
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"status": "sent"}},
    )
    return {"message": "Invoice sent", "hosted_url": result.get("hosted_invoice_url")}
