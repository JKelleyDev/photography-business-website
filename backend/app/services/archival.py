from datetime import datetime
from app.database import get_database
from app.services.s3 import delete_prefix_from_s3


async def archive_expired_projects() -> int:
    """Find and archive projects past their expiration date. Returns count of archived projects."""
    db = get_database()
    now = datetime.utcnow()
    cursor = db.projects.find({
        "status": "active",
        "project_expires_at": {"$lte": now, "$ne": None},
    })
    archived_count = 0
    async for project in cursor:
        project_id = str(project["_id"])
        # Delete all media from S3
        delete_prefix_from_s3(f"projects/{project_id}/")
        # Update project status
        await db.projects.update_one(
            {"_id": project["_id"]},
            {"$set": {"status": "archived", "updated_at": datetime.utcnow()}},
        )
        # Remove media documents
        await db.media.delete_many({"project_id": project_id})
        archived_count += 1
    return archived_count
