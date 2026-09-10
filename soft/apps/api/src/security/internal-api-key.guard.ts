import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { INTERNAL_API_KEY } from './internal-api-key.token.js';

/** Constant-time string comparison that never short-circuits on content. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Service-to-service internal API-key guard for business endpoints.
 *
 * - Requires the `x-internal-api-key` header to match the configured key.
 * - Fails closed (503) when no key is configured for the server.
 * - Never logs, echoes, or returns the configured or provided key.
 *
 * This is not end-user authentication: there are no users, roles, sessions, or
 * JWTs. `GET /health` and `GET /ready` are intentionally left public.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(
    @Inject(INTERNAL_API_KEY)
    private readonly configuredKey: string | undefined,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configuredKey;
    if (!expected) {
      throw new ServiceUnavailableException({ error: 'internal_api_unavailable' });
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const header = request.headers['x-internal-api-key'];
    const provided = Array.isArray(header) ? header[0] : header;

    if (
      typeof provided !== 'string' ||
      provided.length === 0 ||
      !safeEqual(provided, expected)
    ) {
      throw new UnauthorizedException({ error: 'unauthorized' });
    }

    return true;
  }
}
