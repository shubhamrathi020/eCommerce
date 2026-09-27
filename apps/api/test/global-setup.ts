import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from 'pg';

/** A separate database so tests never touch development data. CI provides the same Postgres as a service. */
export const TEST_DATABASE_URL = process.env['TEST_DATABASE_URL'] ?? 'postgresql://ecommerce:ecommerce@localhost:5432/ecommerce_test?schema=public';

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
}
