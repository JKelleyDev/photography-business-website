import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getDb } from '../src/database';
import { newUser } from '../src/models/user';
import { hashPassword } from '../src/services/auth';

async function seedAdmin() {
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@madphotography.com';
  const password = process.env.ADMIN_SEED_PASSWORD || 'changeme123';
  const name = process.env.ADMIN_SEED_NAME || 'Admin';

  const db = await getDb();
  const existing = await db.collection('users').findOne({ email });
  if (existing) {
    console.log(`Admin user ${email} already exists.`);
    process.exit(0);
  }

  const admin = newUser(email, hashPassword(password), 'admin', name);
  await db.collection('users').insertOne(admin);
  console.log(`Admin user created: ${email}`);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
