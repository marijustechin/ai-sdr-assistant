import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { MarketResearcherService } from '../src/modules/market-researcher/application/research-runs.service.js';
import { resetDatabase } from './helpers/database.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';

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

function standardLimits(overrides: Record<string, number> = {}) {
  return {
    maxQueries: 40,
    maxSources: 120,
    maxRuntimeMinutes: 240,
    maxCountries: 10,
    ...overrides,
  };
}

describe('Product-independent market research request flow (integration)', () => {
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
    vi.restoreAllMocks();
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

  async function createProduct(
    name: string,
    category?: string,
  ): Promise<string> {
    const res = await api('POST', '/products', {
      name,
      ...(category !== undefined ? { category } : {}),
    });
    expect(res.statusCode).toBe(201);
    return (res.json() as Json).id as string;
  }

  function requestBody(
    productId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      productId,
      requestKey: `key-${Math.random().toString(36).slice(2, 12)}`,
      parameters: {
        countries: ['Lithuania'],
        goals: ['SUPPLIERS_MANUFACTURERS'],
        segmentPolicy: 'IDENTIFY_DURING_RESEARCH',
        limits: standardLimits(),
        ...overrides,
      },
    };
  }

  it('requires the internal key on the request endpoints', async () => {
    const missing = await api('POST', '/research-requests', {}, null);
    expect(missing.statusCode).toBe(401);
    const list = await api('GET', '/research-requests', undefined, null);
    expect(list.statusCode).toBe(401);
  });

  it('runs the Abachi flow end to end: submit → queued → discover → intake → claim once', async () => {
    const productId = await createProduct('Thermo Abachi Cladding', 'cladding');

    const submit = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        countries: ['Lithuania', 'Latvia'],
        goals: ['SUPPLIERS_MANUFACTURERS', 'PRICES'],
        segmentPolicy: 'SPECIFIED',
        segments: ['suppliers', 'distributors'],
        questions: ['Who ships to the Baltics?'],
        constraints: ['Public sources only'],
      }),
    );
    expect(submit.statusCode).toBe(201);
    const summary = submit.json() as Json;
    expect(summary.status).toBe('QUEUED');
    expect(summary.countries).toEqual(['Lithuania', 'Latvia']);
    expect(summary.productId).toBe(productId);

    const runId = summary.runId as string;
    const opportunityId = summary.opportunityId as string;

    // Discovered without any human-supplied id.
    const list = await api('GET', '/research-requests?status=QUEUED');
    expect(list.statusCode).toBe(200);
    const rows = list.json() as Json[];
    expect(rows.map((row) => row.runId)).toContain(runId);

    // Intake: parameters + product context.
    const intake = await api('GET', `/research-requests/${runId}`);
    expect(intake.statusCode).toBe(200);
    const intakeBody = intake.json() as Json;
    const request = intakeBody.request as Json;
    expect(request.productName).toBe('Thermo Abachi Cladding');
    const params = request.parameters as Json;
    expect(params.countries).toEqual(['Lithuania', 'Latvia']);
    expect(params.segmentPolicy).toBe('SPECIFIED');
    expect(params.segments).toEqual(['suppliers', 'distributors']);
    const context = intakeBody.context as Json;
    expect((context.product as Json).name).toBe('Thermo Abachi Cladding');

    // Persisted status is QUEUED until claimed.
    const runRead = await api(
      'GET',
      `/opportunities/${opportunityId}/research-runs/${runId}`,
    );
    expect((runRead.json() as Json).status).toBe('QUEUED');

    // Claim exactly once.
    const claim = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${runId}`,
      { status: 'RUNNING' },
    );
    expect(claim.statusCode).toBe(200);
    expect((claim.json() as Json).status).toBe('RUNNING');

    const secondClaim = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${runId}`,
      { status: 'RUNNING' },
    );
    expect(secondClaim.statusCode).toBe(409);
    expect((secondClaim.json() as Json).error).toBe('run_already_running');

    // Concurrent claims from QUEUED: exactly one wins.
    const concurrentId = await createProduct('Cacao beans');
    const concurrentSubmit = (
      await api('POST', '/research-requests', requestBody(concurrentId))
    ).json() as Json;
    const concurrentUrl = `/opportunities/${
      concurrentSubmit.opportunityId as string
    }/research-runs/${concurrentSubmit.runId as string}`;
    const [claimA, claimB] = await Promise.all([
      api('PATCH', concurrentUrl, { status: 'RUNNING' }),
      api('PATCH', concurrentUrl, { status: 'RUNNING' }),
    ]);
    const codes = [claimA.statusCode, claimB.statusCode].sort();
    expect(codes).toEqual([200, 409]);

    const stored = await prisma.db.researchRun.findUnique({
      where: { id: runId },
    });
    expect(stored?.status).toBe('RUNNING');
    expect(stored?.startedAt).not.toBeNull();
    expect(stored?.requestParameters).not.toBeNull();
  });

  it('runs the Cacao beans flow with the same code (no timber-specific fields)', async () => {
    const productId = await createProduct('Cacao beans', 'agricultural commodity');

    const submit = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        countries: ['Ghana', 'Ecuador'],
        goals: [
          'POTENTIAL_BUYERS',
          'PRICES',
          'DISTRIBUTION_CHANNELS',
        ],
        segmentPolicy: 'IDENTIFY_DURING_RESEARCH',
      }),
    );
    expect(submit.statusCode).toBe(201);
    const summary = submit.json() as Json;
    expect(summary.status).toBe('QUEUED');

    const intake = await api('GET', `/research-requests/${summary.runId}`);
    const request = (intake.json() as Json).request as Json;
    expect(request.productName).toBe('Cacao beans');
    expect((request.parameters as Json).segmentPolicy).toBe(
      'IDENTIFY_DURING_RESEARCH',
    );

    // Unspecified segment is stored as an explicit, non-commercial marker.
    const links = await prisma.db.opportunityTargetMarket.findMany({
      where: { opportunityId: summary.opportunityId as string },
      include: { targetMarket: true },
    });
    expect(links.length).toBe(2);
    expect(links.map((link) => link.targetMarket.segment)).toEqual([
      'UNSPECIFIED',
      'UNSPECIFIED',
    ]);
  });

  it('is idempotent for a repeated requestKey and does not duplicate', async () => {
    const productId = await createProduct('Thermo Abachi Cladding');
    const body = requestBody(productId);
    body.requestKey = 'stable-request-key-0001';

    const first = await api('POST', '/research-requests', body);
    const second = await api('POST', '/research-requests', body);
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect((second.json() as Json).runId).toBe((first.json() as Json).runId);

    const count = await prisma.db.researchRun.count();
    expect(count).toBe(1);
    const opportunities = await prisma.db.opportunity.count();
    expect(opportunities).toBe(1);
  });

  it('validates geography, goals and segments server-side', async () => {
    const productId = await createProduct('Thermo Abachi Cladding');

    const noCountries = await api(
      'POST',
      '/research-requests',
      requestBody(productId, { countries: [] }),
    );
    expect(noCountries.statusCode).toBe(400);

    const noGoals = await api(
      'POST',
      '/research-requests',
      requestBody(productId, { goals: [] }),
    );
    expect(noGoals.statusCode).toBe(400);

    const segmentsWhenIdentifying = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        segmentPolicy: 'IDENTIFY_DURING_RESEARCH',
        segments: ['suppliers'],
      }),
    );
    expect(segmentsWhenIdentifying.statusCode).toBe(400);

    const tooManyCountries = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        countries: ['A', 'B', 'C'],
        limits: standardLimits({ maxCountries: 2 }),
      }),
    );
    expect(tooManyCountries.statusCode).toBe(400);
  });

  it('persists cost/tool permissions and validates metered grants', async () => {
    const productId = await createProduct('Rough-Sawn Abachi Lumber');

    const metered = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        limits: {
          ...standardLimits(),
          costPolicy: 'METERED_APPROVED',
          meteredProviders: [
            { provider: 'GEMINI', maxCalls: 20 },
            { provider: 'EXA', maxCalls: 5 },
          ],
        },
      }),
    );
    expect(metered.statusCode).toBe(201);
    const runId = (metered.json() as Json).runId as string;

    const intake = await api('GET', `/research-requests/${runId}`);
    const parameters = ((intake.json() as Json).request as Json)
      .parameters as Json;
    const limits = parameters.limits as Json;
    expect(limits.costPolicy).toBe('METERED_APPROVED');
    expect(limits.meteredProviders).toEqual([
      { provider: 'GEMINI', maxCalls: 20 },
      { provider: 'EXA', maxCalls: 5 },
    ]);

    const missingProviders = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        limits: { ...standardLimits(), costPolicy: 'METERED_APPROVED' },
      }),
    );
    expect(missingProviders.statusCode).toBe(400);

    const freeWithProviders = await api(
      'POST',
      '/research-requests',
      requestBody(productId, {
        limits: {
          ...standardLimits(),
          costPolicy: 'FREE_ONLY',
          meteredProviders: [{ provider: 'GEMINI', maxCalls: 5 }],
        },
      }),
    );
    expect(freeWithProviders.statusCode).toBe(400);

    // FREE_ONLY stays the default when the operator does not choose otherwise.
    const defaulted = await api(
      'POST',
      '/research-requests',
      requestBody(productId),
    );
    const defaultIntake = await api(
      'GET',
      `/research-requests/${(defaulted.json() as Json).runId as string}`,
    );
    const defaultLimits = (
      ((defaultIntake.json() as Json).request as Json).parameters as Json
    ).limits as Json;
    expect(defaultLimits.costPolicy).toBe('FREE_ONLY');
  });

  it('rolls back all related writes when a later step fails', async () => {
    const productId = await createProduct('Thermo Abachi Cladding');
    const market = await app.get(MarketResearcherService);
    vi.spyOn(market, 'createQueuedRun').mockRejectedValueOnce(
      new Error('simulated failure after partial writes'),
    );

    const submit = await api(
      'POST',
      '/research-requests',
      requestBody(productId),
    );
    expect(submit.statusCode).toBeGreaterThanOrEqual(500);

    const offers = await prisma.db.offer.count({ where: { productId } });
    const opportunities = await prisma.db.opportunity.count();
    const runs = await prisma.db.researchRun.count();
    const markets = await prisma.db.targetMarket.count();
    expect(offers).toBe(0);
    expect(opportunities).toBe(0);
    expect(runs).toBe(0);
    expect(markets).toBe(0);
  });

  it('does not change an existing run or opportunity scope', async () => {
    // An "existing" product with an attached target market and a running run.
    const existingProduct = await createProduct('Existing product');
    const existingOffer = (
      await api('POST', `/products/${existingProduct}/offers`, {
        name: 'Existing offer',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'Germany',
        segment: 'buyers',
      })
    ).json() as Json;
    const existingOpportunity = (
      await api('POST', '/opportunities', {
        offerId: existingOffer.id as string,
        name: 'Existing opportunity',
      })
    ).json() as Json;
    const attached = await api(
      'POST',
      `/opportunities/${existingOpportunity.id as string}/target-markets`,
      { targetMarketId: market.id },
    );
    const contextVersionBefore = (attached.json() as Json)
      .contextVersion as number;
    const existingRun = (
      await api(
        'POST',
        `/opportunities/${existingOpportunity.id as string}/research-runs`,
        {},
      )
    ).json() as Json;

    // A new request for a different product.
    const newProduct = await createProduct('Cacao beans');
    const submit = await api(
      'POST',
      '/research-requests',
      requestBody(newProduct),
    );
    expect(submit.statusCode).toBe(201);

    const runAfter = await api(
      'GET',
      `/opportunities/${existingOpportunity.id as string}/research-runs/${existingRun.id as string}`,
    );
    const runBody = runAfter.json() as Json;
    expect(runBody.status).toBe(existingRun.status);
    expect(runBody.contextVersion).toBe(existingRun.contextVersion);
    expect(runBody.targetMarketIds).toEqual(existingRun.targetMarketIds);

    const opportunityAfter = await prisma.db.opportunity.findUnique({
      where: { id: existingOpportunity.id as string },
    });
    expect(opportunityAfter?.contextVersion).toBe(contextVersionBefore);
  });
});
