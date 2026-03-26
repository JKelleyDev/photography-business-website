import { MongoClient, Db } from 'mongodb';
import { config } from './config';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  const client = new MongoClient(config.MONGO_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 5000 });
  await client.connect();

  const dbName = config.MONGO_URI.split('/').pop()?.split('?')[0] || 'mad_photography';
  const db = client.db(dbName);

  try {
    await createIndexes(db);
  } catch (err) {
    console.warn('[DB] Index creation failed (non-fatal):', err);
  }

  cachedClient = client;
  cachedDb = db;
  return db;
}

async function createIndexes(db: Db): Promise<void> {
  await db.collection('users').createIndex({ email: 1 }, { unique: true });

  try {
    await db.collection('projects').dropIndex('share_link_token_1');
  } catch (_) {}
  await db.collection('projects').createIndex(
    { share_link_token: 1 },
    { unique: true, partialFilterExpression: { share_link_token: { $type: 'string' } } },
  );

  await db.collection('media').createIndex({ project_id: 1 });
  await db.collection('portfolio_items').createIndex({ sort_order: 1 });
  await db.collection('pricing_packages').createIndex({ sort_order: 1 });
  await db.collection('reviews').createIndex({ is_approved: 1 });
  await db.collection('invoices').createIndex({ client_id: 1 });
  await db.collection('invoices').createIndex({ token: 1 }, { unique: true });
  await db.collection('site_settings').createIndex({ key: 1 }, { unique: true });
}
