from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.pricing import CreatePricingRequest, UpdatePricingRequest, PricingResponse
from app.models.pricing import new_pricing_package

router = APIRouter()


@router.get("")
async def list_pricing(admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.pricing_packages.find().sort("sort_order", 1)
    items = []
    async for pkg in cursor:
        items.append(PricingResponse(
            id=str(pkg["_id"]),
            name=pkg["name"],
            description=pkg["description"],
            price_cents=pkg["price_cents"],
            price_display=pkg["price_display"],
            features=pkg["features"],
            is_custom=pkg["is_custom"],
            sort_order=pkg["sort_order"],
            is_visible=pkg["is_visible"],
        ))
    return {"packages": items}


@router.post("", status_code=201)
async def create_pricing(body: CreatePricingRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    count = await db.pricing_packages.count_documents({})
    pkg = new_pricing_package(
        name=body.name,
        description=body.description,
        price_cents=body.price_cents,
        price_display=body.price_display,
        features=body.features,
        is_custom=body.is_custom,
        sort_order=count,
    )
    result = await db.pricing_packages.insert_one(pkg)
    return {"id": str(result.inserted_id), "message": "Package created"}


@router.put("/{pkg_id}")
async def update_pricing(pkg_id: str, body: UpdatePricingRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    update = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = datetime.utcnow()
    result = await db.pricing_packages.update_one({"_id": ObjectId(pkg_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Updated"}


@router.delete("/{pkg_id}")
async def delete_pricing(pkg_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    result = await db.pricing_packages.delete_one({"_id": ObjectId(pkg_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Deleted"}
