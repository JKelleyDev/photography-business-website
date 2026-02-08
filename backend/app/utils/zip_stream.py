import io
import zipfile
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
