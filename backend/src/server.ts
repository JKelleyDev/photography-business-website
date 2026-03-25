import app from './app';
import { config } from './config';
import { getDb } from './database';

async function start() {
  app.listen(config.PORT, () => {
    console.log(`MAD Photography API running on http://localhost:${config.PORT}`);
  });
  // Attempt eager DB connection (non-blocking — requests handle lazy connect)
  getDb().catch((err) => console.warn('MongoDB not available at startup:', err.message));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
