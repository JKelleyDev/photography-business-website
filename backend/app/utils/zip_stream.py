import io
import zipfile
import struct
import time
from typing import Generator
from app.services.s3 import get_s3_client
from app.config import get_settings


def create_zip_from_s3_keys(keys_and_names: list[tuple[str, str]]) -> bytes:
    """Create a zip file in memory from a list of (s3_key, filename) tuples."""
    settings = get_settings()
    client = get_s3_client()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for s3_key, filename in keys_and_names:
            response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
            file_bytes = response["Body"].read()
            zf.writestr(filename, file_bytes)
    buffer.seek(0)
    return buffer.getvalue()


def stream_zip_from_s3_keys(keys_and_names: list[tuple[str, str]]) -> Generator[bytes, None, None]:
    """Build the zip in memory one file at a time and yield after each file.

    Uses ZIP_STORED (no compression) so the zip is built quickly — the images
    are already JPEG compressed. Yields data after each file is added to keep
    the HTTP connection alive and reduce peak memory.
    """
    settings = get_settings()
    client = get_s3_client()
    buffer = io.BytesIO()
    zf = zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED)
    bytes_yielded = 0
    for s3_key, filename in keys_and_names:
        response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=s3_key)
        file_bytes = response["Body"].read()
        zf.writestr(filename, file_bytes)
        # Yield new bytes written since last yield
        current_pos = buffer.tell()
        if current_pos > bytes_yielded:
            buffer.seek(bytes_yielded)
            yield buffer.read(current_pos - bytes_yielded)
            bytes_yielded = current_pos
    zf.close()
    # Yield the central directory records written on close
    final_pos = buffer.tell()
    if final_pos > bytes_yielded:
        buffer.seek(bytes_yielded)
        yield buffer.read(final_pos - bytes_yielded)
