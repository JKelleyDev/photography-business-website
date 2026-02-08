from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth import require_admin

router = APIRouter()


@router.get("")
async def get_dashboard(admin: dict = Depends(require_admin)):
    db = get_database()
    active_projects = await db.projects.count_documents({"status": "active"})
    delivered_projects = await db.projects.count_documents({"status": "delivered"})
    pending_inquiries = await db.inquiries.count_documents({"status": "new"})
    pending_reviews = await db.reviews.count_documents({"is_approved": False})
    total_clients = await db.users.count_documents({"role": "client"})
    # Revenue from paid invoices
    pipeline = [
        {"$match": {"status": "paid"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount_cents"}}},
    ]
    revenue_result = await db.invoices.aggregate(pipeline).to_list(1)
    total_revenue_cents = revenue_result[0]["total"] if revenue_result else 0
    return {
        "active_projects": active_projects,
        "delivered_projects": delivered_projects,
        "pending_inquiries": pending_inquiries,
        "pending_reviews": pending_reviews,
        "total_clients": total_clients,
        "total_revenue_cents": total_revenue_cents,
    }
