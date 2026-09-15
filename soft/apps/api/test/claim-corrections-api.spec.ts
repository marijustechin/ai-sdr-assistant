import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface Json {
  [key: string]: unknown;
}

async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();
  return app;
}

describe('Claim correction lifecycle API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma.db);
  });

  async function api(
    method: 'POST' | 'GET' | 'PATCH',
    url: string,
    payload?: unknown,
    key: string | null = INTERNAL_KEY,
  ) {
    return app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: key === null ? {} : { 'x-internal-api-key': key },
    });
  }

  async function seedOpportunity(): Promise<{ opportunityId: string }> {
    const product = (
      await api('POST', '/products', { name: 'Abachi' })
    ).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi STS 3D',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'LT',
        segment: 'sauna manufacturers',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Thermo Abachi cladding',
      })
    ).json() as Json;
    await api(
      'POST',
      `/opportunities/${opportunity.id as string}/target-markets`,
      { targetMarketId: market.id },
    );
    return { opportunityId: opportunity.id as string };
  }

  async function startRun(opportunityId: string): Promise<string> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs`,
      {},
    );
    expect(res.statusCode).toBe(201);
    return (res.json() as Json).id as string;
  }

  async function addEvidence(
    opportunityId: string,
    runId: string,
  ): Promise<string> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/evidence`,
      {
        url: 'https://example.invalid/supplier-a',
        evidenceText: 'Supplier A lists thermo-treated abachi cladding.',
        verificationStatus: 'VERIFIED',
        retrievedAt: '2026-09-15T08:05:00.000Z',
      },
    );
    expect(res.statusCode).toBe(201);
    return (res.json() as Json).id as string;
  }

  async function addClaim(
    opportunityId: string,
    runId: string,
    type: 'FACT' | 'INFERENCE' | 'UNKNOWN',
    statement: string,
    evidenceId?: string,
  ): Promise<Json> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims`,
      {
        type,
        statement,
        ...(evidenceId !== undefined
          ? { evidence: [{ evidenceId, stance: 'SUPPORTS' }] }
          : {}),
      },
    );
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  function claimsUrl(opportunityId: string, runId: string, history = false) {
    const base = `/opportunities/${opportunityId}/research-runs/${runId}/claims`;
    return history ? `${base}?includeHistory=true` : base;
  }

  it('requires the internal key on the correction endpoint', async () => {
    const res = await api(
      'POST',
      `/opportunities/${UNKNOWN_UUID}/research-runs/${UNKNOWN_UUID}/claims/${UNKNOWN_UUID}/corrections`,
      { kind: 'RETRACTION', reason: 'no key' },
      null,
    );
    expect(res.statusCode).toBe(401);
  });

  it('replaces a claim: current excludes it, the replacement appears, history keeps the original', async () => {
    const { opportunityId } = await seedOpportunity();
    const runId = await startRun(opportunityId);
    const evidenceId = await addEvidence(opportunityId, runId);

    const original = await addClaim(
      opportunityId,
      runId,
      'FACT',
      'Supplier A price is per piece.',
      evidenceId,
    );
    const replacement = await addClaim(
      opportunityId,
      runId,
      'INFERENCE',
      'Supplier A price is per linear metre.',
      evidenceId,
    );

    const corrected = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims/${original.id as string}/corrections`,
      {
        kind: 'REPLACEMENT',
        reason: 'Unit corrected after re-reading the product page.',
        replacementClaimId: replacement.id,
      },
    );
    expect(corrected.statusCode).toBe(201);
    const correctedBody = corrected.json() as Json;
    expect(correctedBody.lifecycleStatus).toBe('REPLACED');
    expect(correctedBody.replacedByClaimId).toBe(replacement.id);
    expect(correctedBody.correctionReason).toBe(
      'Unit corrected after re-reading the product page.',
    );
    expect(correctedBody.correctedAt).toBeTruthy();

    const current = await api('GET', claimsUrl(opportunityId, runId));
    expect(current.statusCode).toBe(200);
    const currentClaims = current.json() as Array<Json>;
    expect(currentClaims.map((claim) => claim.id)).toEqual([replacement.id]);

    const history = await api('GET', claimsUrl(opportunityId, runId, true));
    expect(history.statusCode).toBe(200);
    const allClaims = history.json() as Array<Json>;
    expect(allClaims).toHaveLength(2);

    // The original is preserved untouched apart from its correction lifecycle.
    const kept = allClaims.find((claim) => claim.id === original.id) as Json;
    expect(kept.statement).toBe('Supplier A price is per piece.');
    expect(kept.type).toBe('FACT');
    expect(kept.lifecycleStatus).toBe('REPLACED');
    expect((kept.evidence as Array<Json>)[0]?.evidenceId).toBe(evidenceId);
  });

  it('retracts a claim: current excludes it, history keeps it without a replacement', async () => {
    const { opportunityId } = await seedOpportunity();
    const runId = await startRun(opportunityId);
    const original = await addClaim(
      opportunityId,
      runId,
      'UNKNOWN',
      'Whether any GB-based seller exists is not established.',
    );

    const retracted = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims/${original.id as string}/corrections`,
      { kind: 'RETRACTION', reason: 'Replaced by a search-bounded finding.' },
    );
    expect(retracted.statusCode).toBe(201);
    const retractedBody = retracted.json() as Json;
    expect(retractedBody.lifecycleStatus).toBe('RETRACTED');
    expect(retractedBody.replacedByClaimId).toBeNull();
    expect(retractedBody.correctionReason).toBe(
      'Replaced by a search-bounded finding.',
    );

    expect(
      (await api('GET', claimsUrl(opportunityId, runId))).json(),
    ).toEqual([]);
    const history = (
      await api('GET', claimsUrl(opportunityId, runId, true))
    ).json() as Array<Json>;
    expect(history).toHaveLength(1);
    expect(history[0]?.lifecycleStatus).toBe('RETRACTED');
  });

  it('rejects invalid corrections (shape, self, cross-run, non-current, double, unknown)', async () => {
    const { opportunityId } = await seedOpportunity();
    const runId = await startRun(opportunityId);
    const otherRunId = await startRun(opportunityId);

    const claimA = await addClaim(opportunityId, runId, 'UNKNOWN', 'A.');
    const claimB = await addClaim(opportunityId, runId, 'UNKNOWN', 'B.');
    const otherRunClaim = await addClaim(
      opportunityId,
      otherRunId,
      'UNKNOWN',
      'Other run.',
    );

    const correctionUrl = (claimId: string) =>
      `/opportunities/${opportunityId}/research-runs/${runId}/claims/${claimId}/corrections`;

    // Shape validation (Zod) — REPLACEMENT requires an id, RETRACTION forbids it.
    expect(
      (
        await api('POST', correctionUrl(claimA.id as string), {
          kind: 'REPLACEMENT',
          reason: 'missing id',
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await api('POST', correctionUrl(claimA.id as string), {
          kind: 'RETRACTION',
          reason: 'unexpected id',
          replacementClaimId: claimB.id,
        })
      ).statusCode,
    ).toBe(400);

    // Self replacement.
    const self = await api('POST', correctionUrl(claimA.id as string), {
      kind: 'REPLACEMENT',
      reason: 'self',
      replacementClaimId: claimA.id,
    });
    expect(self.statusCode).toBe(400);
    expect((self.json() as Json).error).toBe('claim_replacement_self');

    // Replacement from another run.
    const crossRun = await api('POST', correctionUrl(claimA.id as string), {
      kind: 'REPLACEMENT',
      reason: 'cross-run',
      replacementClaimId: otherRunClaim.id,
    });
    expect(crossRun.statusCode).toBe(400);
    expect((crossRun.json() as Json).error).toBe(
      'replacement_claim_not_found',
    );

    // Unknown claim.
    const unknown = await api('POST', correctionUrl(UNKNOWN_UUID), {
      kind: 'RETRACTION',
      reason: 'unknown',
    });
    expect(unknown.statusCode).toBe(404);
    expect((unknown.json() as Json).error).toBe('claim_not_found');

    // First correction succeeds; a second on the same claim is a conflict.
    expect(
      (
        await api('POST', correctionUrl(claimA.id as string), {
          kind: 'REPLACEMENT',
          reason: 'first correction',
          replacementClaimId: claimB.id,
        })
      ).statusCode,
    ).toBe(201);

    const twice = await api('POST', correctionUrl(claimA.id as string), {
      kind: 'RETRACTION',
      reason: 'second correction',
    });
    expect(twice.statusCode).toBe(409);
    expect((twice.json() as Json).error).toBe('claim_already_corrected');

    // A replacement must be CURRENT — B points back to a replaced claim, so the
    // cycle is refused because A is no longer current.
    const cycle = await api('POST', correctionUrl(claimB.id as string), {
      kind: 'REPLACEMENT',
      reason: 'cycle attempt',
      replacementClaimId: claimA.id,
    });
    expect(cycle.statusCode).toBe(400);
    expect((cycle.json() as Json).error).toBe(
      'replacement_claim_not_current',
    );
  });
});
