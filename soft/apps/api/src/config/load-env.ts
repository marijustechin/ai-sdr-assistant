import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Absolute path to the workspace root `.env` (`soft/.env`), resolved relative
 * to this module so it works identically from `src/` (tsx) and `dist/` (node).
 */
export const ROOT_ENV_PATH = fileURLToPath(
  new URL('../../../../.env', import.meta.url),
);

/**
 * Load the workspace root `.env` into `process.env` for local development and
 * runtime. An explicit `path` may be supplied (used by tests).
 *
 * - A missing file is a no-op (production relies on real environment vars).
 * - Node's `process.loadEnvFile` preserves existing environment variables, so
 *   real environment variables always take precedence over `.env` values.
 * - No values are read, logged, or echoed here.
 */
export function loadEnv(path: string = ROOT_ENV_PATH): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}
