import crypto from 'crypto';

export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
