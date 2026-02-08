from fastapi import APIRouter, HTTPException, status
from bson import ObjectId
from app.database import get_database
from app.services.s3 import generate_presigned_download_url
from app.schemas.portfolio import PortfolioItemResponse
from app.schemas.pricing import PricingResponse
from app.schemas.inquiry import CreateInquiryRequest, InquiryResponse
from app.schemas.review import CreateReviewRequest, ReviewResponse
from app.schemas.settings import SettingResponse
from app.models.inquiry import new_inquiry
from app.models.review import new_review

router = APIRouter()


@router.get("/portfolio")
async def list_portfolio(category: str | None = None, page: int = 1, limit: int = 20):
    db = get_database()
    query = {"is_visible": True}
    if category:
        query["category"] = category
    skip = (page - 1) * limit
    cursor = db.portfolio_items.find(query).sort("sort_order", 1).skip(skip).limit(limit)
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
    total = await db.portfolio_items.count_documents(query)
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/portfolio/{item_id}")
async def get_portfolio_item(item_id: str):
    db = get_database()
    item = await db.portfolio_items.find_one({"_id": ObjectId(item_id), "is_visible": True})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return PortfolioItemResponse(
        id=str(item["_id"]),
        title=item["title"],
        description=item.get("description"),
        category=item["category"],
        image_url=generate_presigned_download_url(item["image_key"]) if item.get("image_key") else None,
        thumbnail_url=generate_presigned_download_url(item["thumbnail_key"]) if item.get("thumbnail_key") else None,
        sort_order=item["sort_order"],
        is_visible=item["is_visible"],
    )


@router.get("/pricing")
async def list_pricing():
    db = get_database()
    cursor = db.pricing_packages.find({"is_visible": True}).sort("sort_order", 1)
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


@router.post("/inquiries", status_code=status.HTTP_201_CREATED)
async def submit_inquiry(body: CreateInquiryRequest):
    db = get_database()
    inquiry = new_inquiry(
        name=body.name,
        email=body.email,
        message=body.message,
        phone=body.phone,
        package_id=body.package_id,
        event_date=body.event_date,
    )
    result = await db.inquiries.insert_one(inquiry)
    return {"id": str(result.inserted_id), "message": "Inquiry submitted successfully"}


@router.get("/reviews")
async def list_reviews(page: int = 1, limit: int = 20):
    db = get_database()
    skip = (page - 1) * limit
    cursor = db.reviews.find({"is_approved": True}).sort("created_at", -1).skip(skip).limit(limit)
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
    total = await db.reviews.count_documents({"is_approved": True})
    return {"reviews": items, "total": total, "page": page, "limit": limit}


@router.post("/reviews", status_code=status.HTTP_201_CREATED)
async def submit_review(body: CreateReviewRequest):
    db = get_database()
    review = new_review(
        author_name=body.author_name,
        email=body.email,
        rating=body.rating,
        body=body.body,
        project_id=body.project_id,
    )
    result = await db.reviews.insert_one(review)
    return {"id": str(result.inserted_id), "message": "Review submitted and pending approval"}


@router.get("/settings/{key}")
async def get_setting(key: str):
    db = get_database()
    setting = await db.site_settings.find_one({"key": key})
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return SettingResponse(key=setting["key"], value=setting["value"])
