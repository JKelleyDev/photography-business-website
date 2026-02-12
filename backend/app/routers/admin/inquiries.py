from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.inquiry import UpdateInquiryRequest, InquiryResponse

router = APIRouter()


@router.get("")
async def list_inquiries(status: str | None = None, admin: dict = Depends(require_admin)):
    db = get_database()
    query = {}
    if status:
        query["status"] = status
    cursor = db.inquiries.find(query).sort("created_at", -1)
    items = []
    async for inq in cursor:
        items.append(InquiryResponse(
            id=str(inq["_id"]),
            name=inq["name"],
            email=inq["email"],
            phone=inq.get("phone"),
            package_id=inq.get("package_id"),
            message=inq["message"],
            event_date=inq.get("event_date"),
            event_time=inq.get("event_time"),
            event_duration=inq.get("event_duration"),
            status=inq["status"],
            created_at=inq["created_at"],
        ))
    return {"inquiries": items}


@router.put("/{inquiry_id}")
async def update_inquiry(inquiry_id: str, body: UpdateInquiryRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    valid_statuses = ["new", "contacted", "booked", "closed"]
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    result = await db.inquiries.update_one(
        {"_id": ObjectId(inquiry_id)},
        {"$set": {"status": body.status}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    return {"message": "Updated"}
