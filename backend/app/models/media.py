from datetime import datetime


def new_media(
    project_id: str,
    original_key: str,
    compressed_key: str,
    thumbnail_key: str,
    watermarked_key: str,
    filename: str,
    mime_type: str,
    width: int,
    height: int,
    size_bytes: int,
    compressed_size_bytes: int,
    sort_order: int = 0,
) -> dict:
    return {
        "project_id": project_id,
        "original_key": original_key,
        "compressed_key": compressed_key,
        "thumbnail_key": thumbnail_key,
        "watermarked_key": watermarked_key,
        "filename": filename,
        "mime_type": mime_type,
        "width": width,
        "height": height,
        "size_bytes": size_bytes,
        "compressed_size_bytes": compressed_size_bytes,
        "sort_order": sort_order,
        "uploaded_at": datetime.utcnow(),
        "is_selected": False,
    }
