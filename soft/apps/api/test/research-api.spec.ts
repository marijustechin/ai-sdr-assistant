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

/** Boots an independent Nest application (a fresh in-process HTTP client). */
async function createApp(): Promise<NestFastifyApplication> {
  const newApp = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await newApp.init();
  return newApp;
}

describe('Research persistence API (integration)', () => {
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

  async function seedOpportunity(): Promise<{
    opportunityId: string;
    targetMarketId: string;
  }> {
    const product = (await api('POST', '/products', { name: 'Abachi' })).json() as Json;
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
    await api('POST', `/opportunities/${opportunity.id as string}/target-markets`, {
      targetMarketId: market.id,
    });
    return {
      opportunityId: opportunity.id as string,
      targetMarketId: market.id as string,
    };
  }

  async function startRun(opportunityId: string): Promise<Json> {
    const res = await api('POST', `/opportunities/${opportunityId}/research-runs`, {});
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  it('requires the internal key on the research endpoints', async () => {
    const missing = await api(
      'POST',
      `/opportunities/${UNKNOWN_UUID}/research-runs`,
      {},
      null,
    );
    expect(missing.statusCode).toBe(401);

    const wrong = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/research-runs`,
      undefined,
      'wrong-key-value-000000000000',
    );
    expect(wrong.statusCode).toBe(401);
  });

  it('runs the minimum resumable scenario: run → query → source → evidence → claim', async () => {
    const { opportunityId, targetMarketId } = await seedOpportunity();

    const run = await startRun(opportunityId);
    expect(run.status).toBe('RUNNING');
    expect(run.contextVersion).toBe(2);
    expect(run.targetMarketIds).toEqual([targetMarketId]);

    const query = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/queries`,
      {
        queryText: 'abachi cladding suppliers Lithuania',
        provider: 'exa',
        status: 'SUCCEEDED',
        resultCount: 12,
      },
    );
    expect(query.statusCode).toBe(201);

    const sourceRes = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/sources`,
      { url: 'https://example.invalid/supplier-a', title: 'Supplier A' },
    );
    expect(sourceRes.statusCode).toBe(201);
    const source = sourceRes.json() as Json;

    const sameSourceRes = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/sources`,
      { url: 'https://example.invalid/supplier-a' },
    );
    expect((sameSourceRes.json() as Json).id).toBe(source.id);

    const evidenceRes = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/evidence`,
      {
        url: 'https://example.invalid/supplier-a',
        evidenceText: 'Supplier A lists thermo-treated abachi cladding (20x95mm).',
        verificationStatus: 'VERIFIED',
        retrievedAt: '2026-09-15T08:05:00.000Z',
      },
    );
    expect(evidenceRes.statusCode).toBe(201);
    const evidence = evidenceRes.json() as Json;
    expect((evidence.source as Json).id).toBe(source.id);
    expect(evidence.verificationStatus).toBe('VERIFIED');

    const claimRes = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/claims`,
      {
        type: 'FACT',
        statement: 'Supplier A offers thermo-treated abachi cladding.',
        confidence: 'HIGH',
        evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
      },
    );
    expect(claimRes.statusCode).toBe(201);
    const claim = claimRes.json() as Json;
    expect((claim.evidence as Array<Json>)[0]?.evidenceId).toBe(evidence.id);

    const resume = await api(
      'GET',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
    );
    expect(resume.statusCode).toBe(200);
    const runRead = resume.json() as Json;
    expect(runRead.status).toBe('RUNNING');
    expect((runRead.queries as Array<Json>)).toHaveLength(1);

    const sources = await api(
      'GET',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/sources`,
    );
    expect(sources.statusCode).toBe(200);
    expect(sources.json()).toHaveLength(1);

    const allClaims = await api(
      'GET',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}/claims`,
    );
    expect(allClaims.json()).toHaveLength(1);
  });

  it('rejects a FACT claim without evidence and evidence from another run', async () => {
    const { opportunityId } = await seedOpportunity();
    const runA = await startRun(opportunityId);
    const runB = await startRun(opportunityId);

    const noEvidence = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runA.id as string}/claims`,
      { type: 'FACT', statement: 'Unsupported.' },
    );
    expect(noEvidence.statusCode).toBe(400);

    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/research-runs/${runA.id as string}/evidence`,
        {
          url: 'https://example.invalid/x',
          evidenceText: 'Observed.',
          verificationStatus: 'VERIFIED',
        },
      )
    ).json() as Json;

    const crossRun = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runB.id as string}/claims`,
      {
        type: 'INFERENCE',
        statement: 'Cross-run inference.',
        evidence: [{ evidenceId: evidence.id as string }],
      },
    );
    expect(crossRun.statusCode).toBe(400);
  });

  it('pauses and resumes, keeping pauseReason distinct from FAILED', async () => {
    const { opportunityId } = await seedOpportunity();
    const run = await startRun(opportunityId);

    const paused = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
      { status: 'PAUSED', pauseReason: 'NEEDS_HUMAN' },
    );
    expect(paused.statusCode).toBe(200);
    expect((paused.json() as Json).status).toBe('PAUSED');
    expect((paused.json() as Json).pauseReason).toBe('NEEDS_HUMAN');

    const resumed = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
      { status: 'RUNNING' },
    );
    expect(resumed.statusCode).toBe(200);
    const resumedBody = resumed.json() as Json;
    expect(resumedBody.status).toBe('RUNNING');
    expect(resumedBody.pauseReason).toBeNull();

    const failedNoCode = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
      { status: 'FAILED' },
    );
    expect(failedNoCode.statusCode).toBe(400);
  });

  it('records a checkpoint and blocks resume on a context change', async () => {
    const { opportunityId } = await seedOpportunity();
    const run = await startRun(opportunityId);

    const checkpoint = {
      coverage: [
        { targetMarketId: 'm1', dimension: 'suppliers', status: 'PARTIAL' },
      ],
      pendingFollowUps: [{ kind: 'SOURCE', ref: 'example.invalid' }],
    };
    const saved = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
      { checkpoint },
    );
    expect(saved.statusCode).toBe(200);
    expect((saved.json() as Json).checkpoint).toMatchObject(checkpoint);

    // A new target market changes the opportunity's context version.
    const deMarket = (
      await api('POST', '/target-markets', {
        country: 'DE',
        segment: 'timber importers',
      })
    ).json() as Json;
    await api(
      'POST',
      `/opportunities/${opportunityId}/target-markets`,
      { targetMarketId: deMarket.id },
    );

    const blocked = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
      { status: 'RUNNING' },
    );
    expect(blocked.statusCode).toBe(409);
    expect((blocked.json() as Json).error).toBe('context_changed');

    const paused = await api(
      'GET',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
    );
    expect((paused.json() as Json).status).toBe('PAUSED');
    expect((paused.json() as Json).pauseReason).toBe('CONTEXT_CHANGED');

    const acknowledged = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${run.id as string}`,
      { status: 'RUNNING', contextVersion: 3 },
    );
    expect(acknowledged.statusCode).toBe(200);
    expect((acknowledged.json() as Json).status).toBe('RUNNING');
    expect((acknowledged.json() as Json).contextVersion).toBe(3);
  });

  it('returns 404 for an unknown run and lists runs for an opportunity', async () => {
    const { opportunityId } = await seedOpportunity();
    await startRun(opportunityId);

    const list = await api('GET', `/opportunities/${opportunityId}/research-runs`);
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);

    const missing = await api(
      'GET',
      `/opportunities/${opportunityId}/research-runs/${UNKNOWN_UUID}`,
    );
    expect(missing.statusCode).toBe(404);

    const unknownOpportunity = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/research-runs`,
    );
    expect(unknownOpportunity.statusCode).toBe(404);
  });

  it('reads and resumes a paused, fully-persisted run from a fresh client', async () => {
    const { opportunityId } = await seedOpportunity();
    const run = await startRun(opportunityId);
    const runId = run.id as string;

    // Persist the full record set with the first client.
    await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/queries`,
      {
        queryText: 'abachi cladding suppliers LT',
        provider: 'exa',
        status: 'SUCCEEDED',
        resultCount: 4,
      },
    );
    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/research-runs/${runId}/evidence`,
        {
          url: 'https://fresh.example.invalid/a',
          evidenceText: 'Fresh-client evidence observation.',
          verificationStatus: 'VERIFIED',
          retrievedAt: '2026-09-15T09:00:00.000Z',
        },
      )
    ).json() as Json;
    await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/claims`,
      {
        type: 'INFERENCE',
        statement: 'Fresh-client conclusion.',
        confidence: 'MEDIUM',
        evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
      },
    );
    const checkpoint = {
      coverage: [
        { targetMarketId: 'm1', dimension: 'suppliers', status: 'PARTIAL' },
      ],
      pendingFollowUps: [{ kind: 'SOURCE', ref: 'fresh.example.invalid' }],
    };
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${runId}`,
      { status: 'PAUSED', pauseReason: 'BUDGET_EXHAUSTED', checkpoint },
    );

    // A brand-new application instance reads the persisted state and resumes.
    const fresh = await createApp();
    try {
      const call = (
        method: 'GET' | 'PATCH',
        url: string,
        payload?: unknown,
      ) =>
        fresh.inject({
          method,
          url,
          ...(payload !== undefined ? { payload: payload as object } : {}),
          headers: { 'x-internal-api-key': INTERNAL_KEY },
        });

      const read = await call(
        'GET',
        `/opportunities/${opportunityId}/research-runs/${runId}`,
      );
      expect(read.statusCode).toBe(200);
      const persisted = read.json() as Json;
      expect(persisted.status).toBe('PAUSED');
      expect(persisted.pauseReason).toBe('BUDGET_EXHAUSTED');
      expect(persisted.contextVersion).toBe(2);
      expect(persisted.checkpoint).toMatchObject(checkpoint);
      expect(persisted.queries as Array<Json>).toHaveLength(1);

      const evidenceRead = await call(
        'GET',
        `/opportunities/${opportunityId}/research-runs/${runId}/evidence`,
      );
      expect(evidenceRead.statusCode).toBe(200);
      const evidenceRows = evidenceRead.json() as Array<Json>;
      expect(evidenceRows).toHaveLength(1);
      expect(evidenceRows[0]?.evidenceText).toBe(
        'Fresh-client evidence observation.',
      );

      const claimsRead = await call(
        'GET',
        `/opportunities/${opportunityId}/research-runs/${runId}/claims`,
      );
      expect(claimsRead.json()).toHaveLength(1);

      const resumed = await call(
        'PATCH',
        `/opportunities/${opportunityId}/research-runs/${runId}`,
        { status: 'RUNNING' },
      );
      expect(resumed.statusCode).toBe(200);
      const resumedBody = resumed.json() as Json;
      expect(resumedBody.status).toBe('RUNNING');
      expect(resumedBody.pauseReason).toBeNull();
    } finally {
      await fresh.close();
    }
  });

  it('rejects a research run when the opportunity has no attached target markets', async () => {
    const product = (
      await api('POST', '/products', { name: 'Abachi' })
    ).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi STS 3D',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Thermo Abachi cladding (no scope)',
      })
    ).json() as Json;

    const rejected = await api(
      'POST',
      `/opportunities/${opportunity.id as string}/research-runs`,
      {},
    );
    expect(rejected.statusCode).toBe(409);
    expect((rejected.json() as Json).error).toBe('research_scope_empty');

    const runs = await api(
      'GET',
      `/opportunities/${opportunity.id as string}/research-runs`,
    );
    expect(runs.statusCode).toBe(200);
    expect(runs.json()).toEqual([]);
  });
});
