import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return bcrypt.compareSync(plain, hashed);
}

export function createAccessToken(userId: string, role: string): string {
  const expiresIn = config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60;
  return jwt.sign({ sub: userId, role, type: 'access' }, config.JWT_SECRET, { expiresIn });
}

export function createRefreshToken(userId: string): string {
  const expiresIn = config.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60;
  return jwt.sign({ sub: userId, type: 'refresh' }, config.JWT_SECRET, { expiresIn });
}

export function decodeToken(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, config.JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createInviteToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function createPasswordResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
