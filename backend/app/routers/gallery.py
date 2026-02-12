from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response as FastAPIResponse
from bson import ObjectId
from app.database import get_database
from app.services.s3 import generate_presigned_download_url, download_file_from_s3
from app.services.image_processing import apply_watermark
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


async def _get_unpaid_invoice(project_id: str) -> dict | None:
    db = get_database()
    return await db.invoices.find_one({
        "project_id": project_id,
        "status": {"$nin": ["paid", "void"]},
    })


@router.get("/{token}")
async def get_gallery(token: str):
    project = await _get_valid_project(token)
    project_id = str(project["_id"])
    unpaid = await _get_unpaid_invoice(project_id)
    return {
        "title": project["title"],
        "description": project["description"],
        "status": project["status"],
        "categories": project["categories"],
        "share_link_expires_at": project.get("share_link_expires_at"),
        "downloads_locked": unpaid is not None,
        "invoice_token": unpaid.get("token") if unpaid else None,
    }


@router.get("/{token}/media")
async def list_gallery_media(token: str):
    project = await _get_valid_project(token)
    db = get_database()
    project_id = str(project["_id"])
    unpaid = await _get_unpaid_invoice(project_id)
    downloads_locked = unpaid is not None
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
    return {"media": items, "downloads_locked": downloads_locked}


@router.get("/{token}/media/{media_id}/watermarked")
async def get_watermarked_image(token: str, media_id: str):
    project = await _get_valid_project(token)
    project_id = str(project["_id"])
    unpaid = await _get_unpaid_invoice(project_id)
    if not unpaid:
        raise HTTPException(status_code=403, detail="Watermark not applicable for paid projects")
    db = get_database()
    media = await db.media.find_one({"_id": ObjectId(media_id), "project_id": project_id})
    if not media:
        raise HTTPException(status_code=404, detail="Image not found")
    image_bytes = download_file_from_s3(media["compressed_key"])
    watermarked = apply_watermark(image_bytes)
    return FastAPIResponse(content=watermarked, media_type="image/jpeg")


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
    project_id = str(project["_id"])
    if await _get_unpaid_invoice(project_id):
        raise HTTPException(status_code=402, detail="Downloads are locked until the invoice is paid")
    db = get_database()
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
    project_id = str(project["_id"])
    if await _get_unpaid_invoice(project_id):
        raise HTTPException(status_code=402, detail="Downloads are locked until the invoice is paid")
    db = get_database()
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
    project_id = str(project["_id"])
    if await _get_unpaid_invoice(project_id):
        raise HTTPException(status_code=402, detail="Downloads are locked until the invoice is paid")
    db = get_database()
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
