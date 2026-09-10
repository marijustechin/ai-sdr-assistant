export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
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

export function loadConfig(): AppConfig {
  return {
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
    port: parsePort(process.env.PORT),
  };
}
