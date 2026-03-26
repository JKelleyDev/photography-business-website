import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config';
import { Readable } from 'stream';

function getS3Client(): S3Client {
  return new S3Client({
    region: config.AWS_REGION,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export async function generatePresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const cmd = new PutObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key, ContentType: contentType });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function generatePresignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  const client = getS3Client();
  const cmd = new GetObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key });
  return getSignedUrl(client, cmd, { expiresIn });
}

export async function uploadFileToS3(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getS3Client();
  await client.send(new PutObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key, Body: body, ContentType: contentType }));
}

export async function deleteFileFromS3(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key }));
}

export async function deletePrefixFromS3(prefix: string): Promise<void> {
  const client = getS3Client();
  const list = await client.send(new ListObjectsV2Command({ Bucket: config.S3_BUCKET_NAME, Prefix: prefix }));
  if (!list.Contents?.length) return;
  const objects = list.Contents.map((o) => ({ Key: o.Key! }));
  await client.send(new DeleteObjectsCommand({ Bucket: config.S3_BUCKET_NAME, Delete: { Objects: objects } }));
}

export async function getS3ObjectStream(key: string): Promise<Readable> {
  const client = getS3Client();
  const response = await client.send(new GetObjectCommand({ Bucket: config.S3_BUCKET_NAME, Key: key }));
  return response.Body as Readable;
}
