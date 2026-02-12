import boto3
from botocore.config import Config as BotoConfig
from app.config import get_settings


def get_s3_client():
    settings = get_settings()
    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
        config=BotoConfig(signature_version="s3v4"),
    )


def generate_presigned_upload_url(key: str, content_type: str, expires_in: int = 3600) -> str:
    settings = get_settings()
    client = get_s3_client()
    return client.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": settings.S3_BUCKET_NAME,
            "Key": key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


def generate_presigned_download_url(key: str, expires_in: int = 900) -> str:
    settings = get_settings()
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )


def upload_file_to_s3(key: str, file_bytes: bytes, content_type: str) -> None:
    settings = get_settings()
    client = get_s3_client()
    client.put_object(
        Bucket=settings.S3_BUCKET_NAME,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
    )


def download_file_from_s3(key: str) -> bytes:
    settings = get_settings()
    client = get_s3_client()
    response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    return response["Body"].read()


def delete_file_from_s3(key: str) -> None:
    settings = get_settings()
    client = get_s3_client()
    client.delete_object(Bucket=settings.S3_BUCKET_NAME, Key=key)


def delete_prefix_from_s3(prefix: str) -> None:
    settings = get_settings()
    client = get_s3_client()
    response = client.list_objects_v2(Bucket=settings.S3_BUCKET_NAME, Prefix=prefix)
    if "Contents" in response:
        objects = [{"Key": obj["Key"]} for obj in response["Contents"]]
        client.delete_objects(
            Bucket=settings.S3_BUCKET_NAME,
            Delete={"Objects": objects},
        )
