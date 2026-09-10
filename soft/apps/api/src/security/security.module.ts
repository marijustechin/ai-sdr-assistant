import { Global, Module } from '@nestjs/common';
import { INTERNAL_API_KEY } from './internal-api-key.token.js';
import { InternalApiKeyGuard } from './internal-api-key.guard.js';

/**
 * Reads the internal service key from the environment. A missing or
 * too-short key is treated as "not configured" so the guard fails closed.
 * The value is never logged or returned.
 */
export function readInternalApiKey(): string | undefined {
  const trimmed = process.env.INTERNAL_API_KEY?.trim();
  return trimmed && trimmed.length >= 16 ? trimmed : undefined;
}

@Global()
@Module({
  providers: [
    { provide: INTERNAL_API_KEY, useFactory: readInternalApiKey },
    InternalApiKeyGuard,
  ],
  exports: [INTERNAL_API_KEY, InternalApiKeyGuard],
})
export class SecurityModule {}
