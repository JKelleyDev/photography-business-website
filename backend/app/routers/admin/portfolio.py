from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.portfolio import (
    UpdatePortfolioItemRequest,
    ReorderPortfolioRequest,
    PortfolioItemResponse,
)
from app.models.portfolio import new_portfolio_item
from app.services.image_processing import process_and_upload_portfolio_image
from app.services.s3 import generate_presigned_download_url, delete_file_from_s3

router = APIRouter()


@router.get("")
async def list_portfolio(admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.portfolio_items.find().sort("sort_order", 1)
    items = []
    async for item in cursor:
        items.append(PortfolioItemResponse(
            id=str(item["_id"]),
            title=item["title"],
            description=item.get("description"),
            category=item["category"],
            image_url=generate_presigned_download_url(item["image_key"]) if item.get("image_key") else None,
            thumbnail_url=generate_presigned_download_url(item["thumbnail_key"]) if item.get("thumbnail_key") else None,
            sort_order=item["sort_order"],
            is_visible=item["is_visible"],
        ))
    return {"items": items}


@router.post("", status_code=201)
async def create_portfolio_item(
    title: str = Form(...),
    category: str = Form("general"),
    description: str = Form(None),
    image: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    db = get_database()
    file_bytes = await image.read()
    result = process_and_upload_portfolio_image(file_bytes, image.filename, image.content_type)
    count = await db.portfolio_items.count_documents({})
    item = new_portfolio_item(
        title=title,
        image_key=result["image_key"],
        thumbnail_key=result["thumbnail_key"],
        category=category,
        description=description,
        sort_order=count,
    )
    insert = await db.portfolio_items.insert_one(item)
    return {"id": str(insert.inserted_id), "message": "Portfolio item created"}


@router.put("/{item_id}")
async def update_portfolio_item(item_id: str, body: UpdatePortfolioItemRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.portfolio_items.update_one({"_id": ObjectId(item_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Updated"}


@router.delete("/{item_id}")
async def delete_portfolio_item(item_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    item = await db.portfolio_items.find_one({"_id": ObjectId(item_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.get("image_key"):
        delete_file_from_s3(item["image_key"])
    if item.get("thumbnail_key"):
        delete_file_from_s3(item["thumbnail_key"])
    await db.portfolio_items.delete_one({"_id": ObjectId(item_id)})
    return {"message": "Deleted"}


@router.put("/reorder")
async def reorder_portfolio(body: ReorderPortfolioRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    for idx, item_id in enumerate(body.item_ids):
        await db.portfolio_items.update_one({"_id": ObjectId(item_id)}, {"$set": {"sort_order": idx}})
    return {"message": "Reordered"}
