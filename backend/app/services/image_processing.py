import io
import uuid
from PIL import Image
from app.services.s3 import upload_file_to_s3


COMPRESSED_MAX_EDGE = 2048
COMPRESSED_QUALITY = 82
THUMBNAIL_MAX_EDGE = 400
THUMBNAIL_QUALITY = 70


def process_and_upload_image(
    file_bytes: bytes,
    project_id: str,
    filename: str,
    content_type: str,
) -> dict:
    """Process an uploaded image: create compressed and thumbnail versions, upload all to S3."""
    image = Image.open(io.BytesIO(file_bytes))
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    width, height = image.size
    file_id = uuid.uuid4().hex

    # Upload original
    original_key = f"projects/{project_id}/originals/{file_id}.jpg"
    upload_file_to_s3(original_key, file_bytes, content_type)

    # Compressed version
    compressed_image = _resize_image(image, COMPRESSED_MAX_EDGE)
    compressed_bytes = _to_jpeg_bytes(compressed_image, COMPRESSED_QUALITY)
    compressed_key = f"projects/{project_id}/compressed/{file_id}.jpg"
    upload_file_to_s3(compressed_key, compressed_bytes, "image/jpeg")

    # Thumbnail
    thumbnail_image = _resize_image(image, THUMBNAIL_MAX_EDGE)
    thumbnail_bytes = _to_jpeg_bytes(thumbnail_image, THUMBNAIL_QUALITY)
    thumbnail_key = f"projects/{project_id}/thumbnails/{file_id}.jpg"
    upload_file_to_s3(thumbnail_key, thumbnail_bytes, "image/jpeg")

    return {
        "original_key": original_key,
        "compressed_key": compressed_key,
        "thumbnail_key": thumbnail_key,
        "width": width,
        "height": height,
        "size_bytes": len(file_bytes),
        "compressed_size_bytes": len(compressed_bytes),
    }


def process_and_upload_portfolio_image(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> dict:
    """Process a portfolio image: create full-size and thumbnail, upload to S3."""
    image = Image.open(io.BytesIO(file_bytes))
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    file_id = uuid.uuid4().hex

    # Full size (compressed for web)
    full_image = _resize_image(image, COMPRESSED_MAX_EDGE)
    full_bytes = _to_jpeg_bytes(full_image, COMPRESSED_QUALITY)
    image_key = f"portfolio/{file_id}.jpg"
    upload_file_to_s3(image_key, full_bytes, "image/jpeg")

    # Thumbnail
    thumb_image = _resize_image(image, THUMBNAIL_MAX_EDGE)
    thumb_bytes = _to_jpeg_bytes(thumb_image, THUMBNAIL_QUALITY)
    thumbnail_key = f"portfolio/thumbnails/{file_id}.jpg"
    upload_file_to_s3(thumbnail_key, thumb_bytes, "image/jpeg")

    return {"image_key": image_key, "thumbnail_key": thumbnail_key}


def _resize_image(image: Image.Image, max_edge: int) -> Image.Image:
    width, height = image.size
    if max(width, height) <= max_edge:
        return image.copy()
    if width > height:
        new_width = max_edge
        new_height = int(height * (max_edge / width))
    else:
        new_height = max_edge
        new_width = int(width * (max_edge / height))
    return image.resize((new_width, new_height), Image.LANCZOS)


def _to_jpeg_bytes(image: Image.Image, quality: int) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=quality, optimize=True)
    return buffer.getvalue()
