import archiver from 'archiver';
import { Response } from 'express';
import { getS3ObjectStream } from '../services/s3';

export async function streamZipToResponse(
  keysAndNames: { key: string; filename: string }[],
  zipFilename: string,
  res: Response,
): Promise<void> {
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

  const archive = archiver('zip', { zlib: { level: 0 } });
  archive.pipe(res);

  for (const { key, filename } of keysAndNames) {
    const stream = await getS3ObjectStream(key);
    archive.append(stream, { name: filename });
  }

  await archive.finalize();
}
