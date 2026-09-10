export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  /**
   * Optional service-to-service key. When absent, business endpoints fail
   * closed. The value is never logged or returned.
   */
  internalApiKey?: string;
}

const NODE_ENVS: readonly NodeEnv[] = ['development', 'test', 'production'];

function parseNodeEnv(value: string | undefined): NodeEnv {
  const env = value ?? 'development';
  if (!NODE_ENVS.includes(env as NodeEnv)) {
    throw new Error(
      `Invalid NODE_ENV "${env}". Expected one of: ${NODE_ENVS.join(', ')}`,
    );
  }
  return env as NodeEnv;
}

function parsePort(value: string | undefined): number {
  const raw = value ?? '3003';
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid PORT "${raw}". Expected an integer between 1 and 65535.`,
    );
  }
  return port;
}

/**
 * INTERNAL_API_KEY is optional at boot (the internal guard fails closed when it
 * is missing). If provided it must be a plausible secret; the raw value is
 * never included in the error.
 */
export function parseInternalApiKey(
  value: string | undefined,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length < 16) {
    throw new Error(
      'Invalid INTERNAL_API_KEY: it must be at least 16 characters when set.',
    );
  }
  return trimmed;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
    port: parsePort(process.env.PORT),
    internalApiKey: parseInternalApiKey(process.env.INTERNAL_API_KEY),
  };
}
