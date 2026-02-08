from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from bson import ObjectId
from app.database import get_database
from app.middleware.auth import require_admin
from app.schemas.media import MediaResponse, ReorderMediaRequest
from app.models.media import new_media
from app.services.image_processing import process_and_upload_image
from app.services.s3 import generate_presigned_download_url, delete_file_from_s3

router = APIRouter()


@router.get("/{project_id}/media")
async def list_media(project_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    cursor = db.media.find({"project_id": project_id}).sort("sort_order", 1)
    items = []
    async for m in cursor:
        items.append(MediaResponse(
            id=str(m["_id"]),
            project_id=m["project_id"],
            original_url=generate_presigned_download_url(m["original_key"]),
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


@router.post("/{project_id}/media", status_code=201)
async def upload_media(
    project_id: str,
    files: list[UploadFile] = File(...),
    admin: dict = Depends(require_admin),
):
    db = get_database()
    project = await db.projects.find_one({"_id": ObjectId(project_id)})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    count = await db.media.count_documents({"project_id": project_id})
    uploaded = []
    for idx, file in enumerate(files):
        file_bytes = await file.read()
        result = process_and_upload_image(file_bytes, project_id, file.filename, file.content_type)
        media_doc = new_media(
            project_id=project_id,
            original_key=result["original_key"],
            compressed_key=result["compressed_key"],
            thumbnail_key=result["thumbnail_key"],
            filename=file.filename,
            mime_type=file.content_type,
            width=result["width"],
            height=result["height"],
            size_bytes=result["size_bytes"],
            compressed_size_bytes=result["compressed_size_bytes"],
            sort_order=count + idx,
        )
        insert = await db.media.insert_one(media_doc)
        uploaded.append(str(insert.inserted_id))
    return {"media_ids": uploaded, "message": f"{len(uploaded)} files uploaded"}


@router.delete("/{project_id}/media/{media_id}")
async def delete_media(project_id: str, media_id: str, admin: dict = Depends(require_admin)):
    db = get_database()
    m = await db.media.find_one({"_id": ObjectId(media_id), "project_id": project_id})
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    delete_file_from_s3(m["original_key"])
    delete_file_from_s3(m["compressed_key"])
    delete_file_from_s3(m["thumbnail_key"])
    await db.media.delete_one({"_id": ObjectId(media_id)})
    return {"message": "Deleted"}


@router.put("/{project_id}/media/reorder")
async def reorder_media(project_id: str, body: ReorderMediaRequest, admin: dict = Depends(require_admin)):
    db = get_database()
    for idx, media_id in enumerate(body.media_ids):
        await db.media.update_one(
            {"_id": ObjectId(media_id), "project_id": project_id},
            {"$set": {"sort_order": idx}},
        )
    return {"message": "Reordered"}
