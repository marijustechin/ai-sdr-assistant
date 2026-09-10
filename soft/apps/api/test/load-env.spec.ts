import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from '../src/config/load-env.js';

const FILE_ONLY_KEY = 'AI_SDR_TEST_LOAD_ENV_FILE_ONLY';
const PRECEDENCE_KEY = 'AI_SDR_TEST_LOAD_ENV_PRECEDENCE';
const MANAGED_KEYS = [FILE_ONLY_KEY, PRECEDENCE_KEY] as const;

function tempEnvFile(contents: string): { dir: string; file: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ai-sdr-env-'));
  const file = join(dir, '.env');
  writeFileSync(file, contents);
  return { dir, file };
}

describe('loadEnv', () => {
  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      delete process.env[key];
    }
  });

  it('loads variables from the given env file', () => {
    const { dir, file } = tempEnvFile(`${FILE_ONLY_KEY}=from_file\n`);
    try {
      loadEnv(file);
      expect(process.env[FILE_ONLY_KEY]).toBe('from_file');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('preserves existing environment variables (real env wins over .env)', () => {
    process.env[PRECEDENCE_KEY] = 'from_process';
    const { dir, file } = tempEnvFile(`${PRECEDENCE_KEY}=from_file\n`);
    try {
      loadEnv(file);
      expect(process.env[PRECEDENCE_KEY]).toBe('from_process');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is a no-op when the env file does not exist', () => {
    expect(() => loadEnv('/nonexistent/ai-sdr/.env')).not.toThrow();
  });
});
