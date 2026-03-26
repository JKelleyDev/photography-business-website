import sharp from 'sharp';
import crypto from 'crypto';
import { uploadFileToS3, deleteFileFromS3, getS3ObjectStream } from './s3';

async function downloadFromS3(key: string): Promise<Buffer> {
  const stream = await getS3ObjectStream(key);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

const COMPRESSED_MAX_EDGE = 2048;
const COMPRESSED_QUALITY = 82;
const THUMBNAIL_MAX_EDGE = 400;
const THUMBNAIL_QUALITY = 70;
const WATERMARK_TEXT = 'MAD Photos';

function buildWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(Math.floor(width / 12), 24);
  const diagonal = Math.sqrt(width * width + height * height);
  const spacing = fontSize * 6;
  const count = Math.ceil(diagonal / spacing) + 2;

  let texts = '';
  for (let i = -count; i < count * 2; i++) {
    for (let j = -count; j < count * 2; j++) {
      const x = i * spacing;
      const y = j * spacing;
      texts += `<text x="${x}" y="${y}" fill="rgba(255,255,255,0.40)" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" transform="rotate(-30, ${x}, ${y})">${WATERMARK_TEXT}</text>`;
    }
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${texts}</svg>`;
  return Buffer.from(svg);
}

async function resizeToJpeg(input: Buffer, maxEdge: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: false })
    .toBuffer();
}

async function applyWatermark(compressedBuffer: Buffer): Promise<Buffer> {
  const meta = await sharp(compressedBuffer).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;
  const svgOverlay = buildWatermarkSvg(w, h);
  return sharp(compressedBuffer)
    .composite([{ input: svgOverlay, blend: 'over' }])
    .jpeg({ quality: 80 })
    .toBuffer();
}

export async function processAndUploadImage(
  fileBuffer: Buffer,
  projectId: string,
  filename: string,
  contentType: string,
): Promise<{
  original_key: string;
  compressed_key: string;
  thumbnail_key: string;
  watermarked_key: string;
  width: number;
  height: number;
  size_bytes: number;
  compressed_size_bytes: number;
}> {
  const fileId = crypto.randomBytes(16).toString('hex');
  const meta = await sharp(fileBuffer).rotate().metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  const originalKey = `projects/${projectId}/originals/${fileId}.jpg`;
  await uploadFileToS3(originalKey, fileBuffer, contentType);

  const compressedBuffer = await resizeToJpeg(fileBuffer, COMPRESSED_MAX_EDGE, COMPRESSED_QUALITY);
  const compressedKey = `projects/${projectId}/compressed/${fileId}.jpg`;
  await uploadFileToS3(compressedKey, compressedBuffer, 'image/jpeg');

  const thumbnailBuffer = await resizeToJpeg(fileBuffer, THUMBNAIL_MAX_EDGE, THUMBNAIL_QUALITY);
  const thumbnailKey = `projects/${projectId}/thumbnails/${fileId}.jpg`;
  await uploadFileToS3(thumbnailKey, thumbnailBuffer, 'image/jpeg');

  const watermarkedBuffer = await applyWatermark(compressedBuffer);
  const watermarkedKey = `projects/${projectId}/watermarked/${fileId}.jpg`;
  await uploadFileToS3(watermarkedKey, watermarkedBuffer, 'image/jpeg');

  return {
    original_key: originalKey,
    compressed_key: compressedKey,
    thumbnail_key: thumbnailKey,
    watermarked_key: watermarkedKey,
    width,
    height,
    size_bytes: fileBuffer.length,
    compressed_size_bytes: compressedBuffer.length,
  };
}

// Used by the presigned upload flow: browser already uploaded original to S3, backend processes it
export async function processUploadedProjectImage(
  originalKey: string,
  projectId: string,
  fileId: string,
): Promise<{
  compressed_key: string;
  thumbnail_key: string;
  watermarked_key: string;
  width: number;
  height: number;
  size_bytes: number;
  compressed_size_bytes: number;
}> {
  const fileBuffer = await downloadFromS3(originalKey);
  const meta = await sharp(fileBuffer).rotate().metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  const compressedBuffer = await resizeToJpeg(fileBuffer, COMPRESSED_MAX_EDGE, COMPRESSED_QUALITY);
  const compressedKey = `projects/${projectId}/compressed/${fileId}.jpg`;
  await uploadFileToS3(compressedKey, compressedBuffer, 'image/jpeg');

  const thumbnailBuffer = await resizeToJpeg(fileBuffer, THUMBNAIL_MAX_EDGE, THUMBNAIL_QUALITY);
  const thumbnailKey = `projects/${projectId}/thumbnails/${fileId}.jpg`;
  await uploadFileToS3(thumbnailKey, thumbnailBuffer, 'image/jpeg');

  const watermarkedBuffer = await applyWatermark(compressedBuffer);
  const watermarkedKey = `projects/${projectId}/watermarked/${fileId}.jpg`;
  await uploadFileToS3(watermarkedKey, watermarkedBuffer, 'image/jpeg');

  return {
    compressed_key: compressedKey,
    thumbnail_key: thumbnailKey,
    watermarked_key: watermarkedKey,
    width,
    height,
    size_bytes: fileBuffer.length,
    compressed_size_bytes: compressedBuffer.length,
  };
}

// Used by the presigned upload flow for portfolio: processes from temp S3 key then deletes it
export async function processUploadedPortfolioImage(
  tempKey: string,
  fileId: string,
): Promise<{ image_key: string; thumbnail_key: string }> {
  const fileBuffer = await downloadFromS3(tempKey);

  const fullBuffer = await resizeToJpeg(fileBuffer, COMPRESSED_MAX_EDGE, COMPRESSED_QUALITY);
  const imageKey = `portfolio/${fileId}.jpg`;
  await uploadFileToS3(imageKey, fullBuffer, 'image/jpeg');

  const thumbBuffer = await resizeToJpeg(fileBuffer, THUMBNAIL_MAX_EDGE, THUMBNAIL_QUALITY);
  const thumbnailKey = `portfolio/thumbnails/${fileId}.jpg`;
  await uploadFileToS3(thumbnailKey, thumbBuffer, 'image/jpeg');

  await deleteFileFromS3(tempKey);

  return { image_key: imageKey, thumbnail_key: thumbnailKey };
}

export async function processAndUploadPortfolioImage(
  fileBuffer: Buffer,
  _filename: string,
  contentType: string,
): Promise<{ image_key: string; thumbnail_key: string }> {
  const fileId = crypto.randomBytes(16).toString('hex');

  const fullBuffer = await resizeToJpeg(fileBuffer, COMPRESSED_MAX_EDGE, COMPRESSED_QUALITY);
  const imageKey = `portfolio/${fileId}.jpg`;
  await uploadFileToS3(imageKey, fullBuffer, 'image/jpeg');

  const thumbBuffer = await resizeToJpeg(fileBuffer, THUMBNAIL_MAX_EDGE, THUMBNAIL_QUALITY);
  const thumbnailKey = `portfolio/thumbnails/${fileId}.jpg`;
  await uploadFileToS3(thumbnailKey, thumbBuffer, 'image/jpeg');

  return { image_key: imageKey, thumbnail_key: thumbnailKey };
}
