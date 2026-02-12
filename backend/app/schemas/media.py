from datetime import datetime
from pydantic import BaseModel


class MediaResponse(BaseModel):
    id: str
    project_id: str
    original_url: str | None = None
    compressed_url: str | None = None
    thumbnail_url: str | None = None
    watermarked_url: str | None = None
    filename: str
    mime_type: str
    width: int
    height: int
    size_bytes: int
    compressed_size_bytes: int
    sort_order: int
    uploaded_at: datetime
    is_selected: bool


class ReorderMediaRequest(BaseModel):
    media_ids: list[str]


class SelectMediaRequest(BaseModel):
    media_ids: list[str]
    selected: bool = True


class PresignedUploadResponse(BaseModel):
    upload_url: str
    key: str
    media_id: str
