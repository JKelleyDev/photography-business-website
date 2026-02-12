from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.project import (
    CreateProjectRequest,
    UpdateProjectRequest,
    DeliverProjectRequest,
    ProjectResponse,
)
from app.models.project import new_project
from app.models.user import new_user
from app.services.auth import hash_password, create_invite_token
from app.services.email import send_invite_email, send_gallery_link_email
from app.services.s3 import delete_prefix_from_s3
from app.utils.tokens import generate_share_token
from app.models.invoice import new_invoice

router = APIRouter()


def _project_response(p: dict) -> ProjectResponse:
    return ProjectResponse(
        id=str(p["_id"]),
        title=p["title"],
        description=p["description"],
        client_id=str(p["client_id"]),
        status=p["status"],
        cover_image_key=p.get("cover_image_key"),
        categories=p.get("categories", []),
        share_link_token=p.get("share_link_token"),
        share_link_expires_at=p.get("share_link_expires_at"),
        project_expires_at=p.get("project_expires_at"),
        created_at=p["created_at"],
        updated_at=p["updated_at"],
    )


@router.get("")
async def list_projects(status: str | None = None, client_id: str | None = None, admin: dict = Depends(require_admin)):
    db = get_database()
    query = {}
    if status:
        query["status"] = status
    if client_id:
        query["client_id"] = client_id
    cursor = db.projects.find(query).sort("created_at", -1)
    items = []
    async for p in cursor:
        items.append(_project_response(p))
    return {"projects": items}


@router.post("", status_code=201)
async def create_project(body: CreateProjectRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    # Find or create client
    client = await db.users.find_one({"email": body.client_email})
    if not client:
        invite_token = create_invite_token()
        client_doc = new_user(
            email=body.client_email,
            password_hash=hash_password(invite_token),  # temporary
            role="client",
            name=body.client_name,
        )
        client_doc["invite_token"] = invite_token
        result = await db.users.insert_one(client_doc)
        client_id = str(result.inserted_id)
        send_invite_email(body.client_email, body.client_name, invite_token)
    else:
        client_id = str(client["_id"])
    project = new_project(
        title=body.title,
        client_id=client_id,
        description=body.description,
        categories=body.categories,
    )
    insert = await db.projects.insert_one(project)
    # Auto-book inquiry if linked
    if body.inquiry_id:
        await db.inquiries.update_one(
            {"_id": ObjectId(body.inquiry_id)},
            {"$set": {"status": "booked"}},
        )
    return {"id": str(insert.inserted_id), "client_id": client_id, "message": "Project created"}


@router.get("/{project_id}")
async def get_project(project_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    p = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_response(p)


@router.put("/{project_id}")
async def update_project(project_id: str, body: UpdateProjectRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.utcnow()
    result = await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Updated"}


@router.delete("/{project_id}")
async def delete_project(project_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    delete_prefix_from_s3(f"projects/{project_id}/")
    await db.media.delete_many({"project_id": project_id})
    await db.projects.delete_one({"_id": ObjectId(project_id)})
    return {"message": "Project and all media deleted"}


@router.post("/{project_id}/deliver")
async def deliver_project(project_id: str, body: DeliverProjectRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    token = generate_share_token()
    update = {
        "share_link_token": token,
        "status": "delivered",
        "updated_at": datetime.utcnow(),
    }
    if body.share_link_expires_at:
        update["share_link_expires_at"] = body.share_link_expires_at
    if body.project_expires_at:
        update["project_expires_at"] = body.project_expires_at
    await db.projects.update_one({"_id": ObjectId(project_id)}, {"$set": update})
    # Optionally create an invoice
    invoice_token = None
    if body.create_invoice:
        if not body.invoice_line_items or not body.invoice_due_date:
            raise HTTPException(status_code=400, detail="Line items and due date required when creating an invoice")
        total_cents = sum(li.amount_cents * li.quantity for li in body.invoice_line_items)
        line_items_dicts = [li.model_dump() for li in body.invoice_line_items]
        invoice = new_invoice(
            client_id=str(project["client_id"]),
            amount_cents=total_cents,
            line_items=line_items_dicts,
            due_date=body.invoice_due_date,
            project_id=project_id,
        )
        invoice["status"] = "sent"
        await db.invoices.insert_one(invoice)
        invoice_token = invoice["token"]
    # Notify client
    client = await db.users.find_one({"_id": ObjectId(project["client_id"])})
    if client:
        send_gallery_link_email(client["email"], client.get("name", ""), token, project["title"])
    return {"share_link_token": token, "invoice_token": invoice_token, "message": "Project delivered"}


@router.put("/{project_id}/rescind")
async def rescind_delivery(project_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project["status"] != "delivered":
        raise HTTPException(status_code=400, detail="Only delivered projects can be rescinded")
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": "active", "share_link_token": None, "share_link_expires_at": None, "updated_at": datetime.utcnow()}},
    )
    return {"message": "Delivery rescinded, project returned to active"}


@router.put("/{project_id}/archive")
async def archive_project(project_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    delete_prefix_from_s3(f"projects/{project_id}/")
    await db.media.delete_many({"project_id": project_id})
    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {"$set": {"status": "archived", "updated_at": datetime.utcnow()}},
    )
    return {"message": "Project archived"}
