import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { MongoClient } from 'mongodb';

/** Separate stores so tests never touch development data. CI provides the same Postgres/Mongo/Meilisearch
 * as services. */
export const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? 'postgresql://ecommerce:ecommerce@localhost:5432/ecommerce_test?schema=public';
export const TEST_MONGODB_URL = process.env['TEST_MONGODB_URL'] ?? 'mongodb://localhost:27017';
export const TEST_MONGODB_DB_NAME = 'ecommerce_catalog_test';
export const TEST_MEILI_URL = process.env['TEST_MEILI_URL'] ?? 'http://localhost:7700';

export default async function setup(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1);
  const admin = new Client({ connectionString: Object.assign(new URL(url), { pathname: '/postgres', search: '' }).toString() });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(`API tests need PostgreSQL at ${url.host}. Start it with: docker compose up -d postgres\n(${(error as Error).message})`);
  }
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${dbName.replace(/"/g, '')}"`);
  await admin.end();

  const root = resolve(import.meta.dirname, '../../..');
  execSync('pnpm exec prisma migrate deploy --config apps/api/prisma.config.ts --schema apps/api/prisma/schema.prisma', { cwd: root, stdio: 'pipe', env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL } });
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;

  const mongo = new MongoClient(TEST_MONGODB_URL);
  try {
    await mongo.connect();
    await mongo.db(TEST_MONGODB_DB_NAME).command({ ping: 1 });
  } catch (error) {
    throw new Error(`API tests need MongoDB at ${TEST_MONGODB_URL}. Start it with: docker compose up -d mongo\n(${(error as Error).message})`);
  } finally {
    await mongo.close();
  }
  try {
    await fetch(`${TEST_MEILI_URL}/health`);
  } catch (error) {
    throw new Error(`API tests need Meilisearch at ${TEST_MEILI_URL}. Start it with: docker compose up -d meilisearch\n(${(error as Error).message})`);
  }

  // Same seed script docker-compose's catalog-seed one-shot runs, against the isolated test store/index.
  execSync('node --import tsx apps/api/scripts/seed-catalog.ts', {
    cwd: root,
    stdio: 'pipe',
    env: { ...process.env, MONGODB_URL: TEST_MONGODB_URL, MONGODB_DB_NAME: TEST_MONGODB_DB_NAME, MEILI_URL: TEST_MEILI_URL, NODE_ENV: 'test' },
  });
  process.env['MONGODB_URL'] = TEST_MONGODB_URL;
  process.env['MEILI_URL'] = TEST_MEILI_URL;
}
