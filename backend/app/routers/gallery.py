from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response as FastAPIResponse
from bson import ObjectId
from app.database import get_database
from app.services.s3 import generate_presigned_download_url
from app.schemas.media import MediaResponse, SelectMediaRequest
from app.utils.zip_stream import create_zip_from_s3_keys

router = APIRouter()


async def _get_valid_project(token: str) -> dict:
    db = get_database()
    project = await db.projects.find_one({"share_link_token": token})
    if not project:
        raise HTTPException(status_code=404, detail="Gallery not found")
    if project.get("share_link_expires_at") and project["share_link_expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Gallery link has expired")
    if project.get("status") == "archived":
        raise HTTPException(status_code=410, detail="Gallery is no longer available")
    return project


@router.get("/{token}")
async def get_gallery(token: str):
    project = await _get_valid_project(token)
    return {
        "title": project["title"],
        "description": project["description"],
        "status": project["status"],
        "categories": project["categories"],
        "share_link_expires_at": project.get("share_link_expires_at"),
    }


@router.get("/{token}/media")
async def list_gallery_media(token: str):
    project = await _get_valid_project(token)
    db = get_database()
    project_id = str(project["_id"])
    cursor = db.media.find({"project_id": project_id}).sort("sort_order", 1)
    items = []
    async for m in cursor:
        items.append(MediaResponse(
            id=str(m["_id"]),
            project_id=m["project_id"],
            compressed_url=generate_presigned_download_url(m["compressed_key"]),
            thumbnail_url=generate_presigned_download_url(m["thumbnail_key"]),
            filename=m["filename"],
            mime_type=m["mime_type"],
            width=m["width"],
            height=m["height"],
            size_bytes=m["size_bytes"],
            compressed_size_bytes=m["compressed_size_bytes"],
            sort_order=m["sort_order"],
            uploaded_at=m["uploaded_at"],
            is_selected=m["is_selected"],
        ))
    return {"media": items}


@router.post("/{token}/select")
async def select_media(token: str, body: SelectMediaRequest):
    await _get_valid_project(token)
    db = get_database()
    object_ids = [ObjectId(mid) for mid in body.media_ids]
    await db.media.update_many(
        {"_id": {"$in": object_ids}},
        {"$set": {"is_selected": body.selected}},
    )
    return {"message": "Selection updated"}


@router.get("/{token}/download")
async def download_selected(token: str):
    project = await _get_valid_project(token)
    db = get_database()
    project_id = str(project["_id"])
    cursor = db.media.find({"project_id": project_id, "is_selected": True})
    keys_and_names = []
    async for m in cursor:
        keys_and_names.append((m["original_key"], m["filename"]))
    if not keys_and_names:
        raise HTTPException(status_code=400, detail="No images selected")
    zip_bytes = create_zip_from_s3_keys(keys_and_names)
    return FastAPIResponse(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project["title"]}_selected.zip"'},
    )


@router.get("/{token}/download-all")
async def download_all(token: str):
    project = await _get_valid_project(token)
    db = get_database()
    project_id = str(project["_id"])
    cursor = db.media.find({"project_id": project_id})
    keys_and_names = []
    async for m in cursor:
        keys_and_names.append((m["original_key"], m["filename"]))
    if not keys_and_names:
        raise HTTPException(status_code=400, detail="No images in gallery")
    zip_bytes = create_zip_from_s3_keys(keys_and_names)
    return FastAPIResponse(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{project["title"]}_all.zip"'},
    )


@router.post("/{token}/shutterfly-export")
async def shutterfly_export(token: str):
    project = await _get_valid_project(token)
    db = get_database()
    project_id = str(project["_id"])
    cursor = db.media.find({"project_id": project_id, "is_selected": True})
    keys_and_names = []
    async for m in cursor:
        keys_and_names.append((m["original_key"], m["filename"]))
    if not keys_and_names:
        raise HTTPException(status_code=400, detail="No images selected for export")
    zip_bytes = create_zip_from_s3_keys(keys_and_names)
    return FastAPIResponse(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{project["title"]}_for_printing.zip"',
            "X-Shutterfly-Redirect": "https://www.shutterfly.com/photos/upload",
        },
    )
