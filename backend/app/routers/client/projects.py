from fastapi import APIRouter, Depends
from app.database import get_database
from app.middleware.auth import require_client
from app.schemas.project import ProjectResponse

router = APIRouter()


@router.get("")
async def list_my_projects(user: dict = Depends(require_client)):
    db = get_database()
    cursor = db.projects.find({"client_id": user["_id"]}).sort("created_at", -1)
    items = []
    async for p in cursor:
        items.append(ProjectResponse(
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
        ))
    return {"projects": items}
