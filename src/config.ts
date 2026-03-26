import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/mad_photography',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me-in-production',
  JWT_ACCESS_TOKEN_EXPIRE_MINUTES: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES || '15', 10),
  JWT_REFRESH_TOKEN_EXPIRE_DAYS: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRE_DAYS || '7', 10),

  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_REGION: process.env.AWS_REGION || 'us-east-2',
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || 'mad-photography-media',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  FROM_EMAIL: process.env.FROM_EMAIL || 'hello@madphotography.com',

  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',

  PORT: parseInt(process.env.PORT || '8000', 10),
};
