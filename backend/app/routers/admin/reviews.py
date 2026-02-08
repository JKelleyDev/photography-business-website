from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.review import UpdateReviewRequest, ReviewResponse

router = APIRouter()


@router.get("")
async def list_all_reviews(admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.reviews.find().sort("created_at", -1)
    items = []
    async for review in cursor:
        items.append(ReviewResponse(
            id=str(review["_id"]),
            author_name=review["author_name"],
            rating=review["rating"],
            body=review["body"],
            is_approved=review["is_approved"],
            created_at=review["created_at"],
        ))
    return {"reviews": items}


@router.put("/{review_id}")
async def update_review(review_id: str, body: UpdateReviewRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.reviews.update_one({"_id": ObjectId(review_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Updated"}


@router.delete("/{review_id}")
async def delete_review(review_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    result = await db.reviews.delete_one({"_id": ObjectId(review_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Deleted"}
