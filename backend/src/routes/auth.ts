import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../database';
import {
  verifyPassword,
  hashPassword,
  createAccessToken,
  createRefreshToken,
  decodeToken,
} from '../services/auth';
import { sendPasswordResetEmail } from '../services/email';
import crypto from 'crypto';

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ detail: 'Email and password required' }); return; }
  const db = await getDb();
  const user = await db.collection('users').findOne({ email, is_active: true });
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ detail: 'Invalid credentials' });
    return;
  }
  const userId = user._id.toString();
  const accessToken = createAccessToken(userId, user.role);
  const refreshToken = createRefreshToken(userId);
  res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ access_token: accessToken });
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) { res.status(401).json({ detail: 'No refresh token' }); return; }
  const payload = decodeToken(refreshToken);
  if (!payload || payload.type !== 'refresh') { res.status(401).json({ detail: 'Invalid refresh token' }); return; }
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(payload.sub as string), is_active: true });
  if (!user) { res.status(401).json({ detail: 'User not found' }); return; }
  const userId = user._id.toString();
  const accessToken = createAccessToken(userId, user.role);
  const newRefresh = createRefreshToken(userId);
  res.cookie('refresh_token', newRefresh, REFRESH_COOKIE_OPTIONS);
  res.json({ access_token: accessToken });
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
});

router.post('/set-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ detail: 'Token and password required' }); return; }
  const db = await getDb();
  const user = await db.collection('users').findOne({ invite_token: token, is_active: true });
  if (!user) { res.status(400).json({ detail: 'Invalid or expired token' }); return; }
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { password_hash: hashPassword(password), updated_at: new Date() }, $unset: { invite_token: '' } },
  );
  res.json({ message: 'Password set successfully' });
});

router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const db = await getDb();
  const user = await db.collection('users').findOne({ email, is_active: true });
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('base64url');
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { reset_token: resetToken, reset_token_expires: new Date(Date.now() + 60 * 60 * 1000) } },
    );
    await sendPasswordResetEmail(user.email, resetToken);
  }
  res.json({ message: 'If an account exists, a reset email has been sent' });
});

router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ detail: 'Token and password required' }); return; }
  const db = await getDb();
  const user = await db.collection('users').findOne({
    reset_token: token,
    reset_token_expires: { $gt: new Date() },
    is_active: true,
  });
  if (!user) { res.status(400).json({ detail: 'Invalid or expired token' }); return; }
  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: { password_hash: hashPassword(password), updated_at: new Date() },
      $unset: { reset_token: '', reset_token_expires: '' },
    },
  );
  res.json({ message: 'Password reset successfully' });
});

export default router;
