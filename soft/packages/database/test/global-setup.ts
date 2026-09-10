import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

/**
 * Isolated database used by the database-package integration tests. Tests must
 * never write to the normal development database (ai_sdr).
 */
const DEFAULT_TEST_DATABASE_URL =
  'postgresql://ai_sdr:ai_sdr_dev@localhost:54329/ai_sdr_test?schema=public';

export function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Create the test database if it does not yet exist (idempotent). */
async function ensureDatabase(url: string): Promise<void> {
  const parsed = new URL(url);
  const dbName = decodeURIComponent(parsed.pathname.slice(1));
  const admin = new URL(url);
  admin.pathname = '/postgres';
  admin.search = '';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    );
    if (result.rowCount === 0) {
      await client.query(`CREATE DATABASE ${quoteIdent(dbName)}`);
    }
  } finally {
    await client.end();
  }
}

export default async function setup(): Promise<() => Promise<void>> {
  const url = testDatabaseUrl();
  await ensureDatabase(url);
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
  return async () => {};
}
