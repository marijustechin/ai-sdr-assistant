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

describe('Catalogue and Research Context API (integration)', () => {
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

  function authed(headers: Record<string, string> = {}): Record<string, string> {
    return { 'x-internal-api-key': INTERNAL_KEY, ...headers };
  }

  async function post(
    url: string,
    payload: unknown,
    key: string | null = INTERNAL_KEY,
  ) {
    return app.inject({
      method: 'POST',
      url,
      payload: payload as object,
      headers: key === null ? {} : { 'x-internal-api-key': key },
    });
  }

  async function createProduct(name = 'Abachi'): Promise<Json> {
    const res = await post('/products', { name });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function createOffer(
    productId: string,
    name = 'Thermo Abachi STS 3D',
  ): Promise<Json> {
    const res = await post(`/products/${productId}/offers`, { name });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function createTargetMarket(
    country = 'LT',
    segment = 'sauna manufacturers',
  ): Promise<Json> {
    const res = await post('/target-markets', { country, segment });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function createOpportunity(
    offerId: string,
    name = 'Thermo Abachi cladding',
  ): Promise<Json> {
    const res = await post('/opportunities', { offerId, name });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function getContext(opportunityId: string, key?: string | null) {
    return app.inject({
      method: 'GET',
      url: `/opportunities/${opportunityId}/research-context`,
      headers: key === undefined ? authed() : key === null ? {} : { 'x-internal-api-key': key },
    });
  }

  it('requires the internal key on every business endpoint', async () => {
    const cases: Array<{ method: 'POST' | 'GET'; url: string; payload?: unknown }> = [
      { method: 'POST', url: '/products', payload: { name: 'x' } },
      {
        method: 'POST',
        url: `/products/${UNKNOWN_UUID}/offers`,
        payload: { name: 'x' },
      },
      { method: 'POST', url: '/product-facts', payload: { key: 'x' } },
      { method: 'POST', url: '/target-markets', payload: { country: 'LT', segment: 's' } },
      { method: 'POST', url: '/opportunities', payload: { offerId: UNKNOWN_UUID, name: 'x' } },
      {
        method: 'POST',
        url: `/opportunities/${UNKNOWN_UUID}/target-markets`,
        payload: { targetMarketId: UNKNOWN_UUID },
      },
      {
        method: 'GET',
        url: `/opportunities/${UNKNOWN_UUID}/research-context`,
      },
    ];

    for (const testCase of cases) {
      const missing = await app.inject({
        method: testCase.method,
        url: testCase.url,
        ...(testCase.payload !== undefined
          ? { payload: testCase.payload as object }
          : {}),
      });
      expect(missing.statusCode, `${testCase.method} ${testCase.url}`).toBe(401);

      const wrong = await app.inject({
        method: testCase.method,
        url: testCase.url,
        headers: { 'x-internal-api-key': 'wrong-key-value-000000000000' },
        ...(testCase.payload !== undefined
          ? { payload: testCase.payload as object }
          : {}),
      });
      expect(wrong.statusCode, `${testCase.method} ${testCase.url}`).toBe(401);
    }
  });

  it('fails safely when no internal key is configured and keeps health public', async () => {
    const previous = process.env.INTERNAL_API_KEY;
    delete process.env.INTERNAL_API_KEY;
    const noKeyApp = await createApp();
    try {
      const blocked = await noKeyApp.inject({
        method: 'POST',
        url: '/products',
        payload: { name: 'x' },
      });
      expect(blocked.statusCode).toBe(503);
      expect(blocked.body).not.toContain('INTERNAL_API_KEY');
      expect(blocked.body).not.toContain(INTERNAL_KEY);

      const health = await noKeyApp.inject({ method: 'GET', url: '/health' });
      expect(health.statusCode).toBe(200);
      expect(health.json()).toEqual({ status: 'ok' });

      const ready = await noKeyApp.inject({ method: 'GET', url: '/ready' });
      expect(ready.statusCode).toBe(200);
      expect(ready.json()).toEqual({ status: 'ready' });
    } finally {
      await noKeyApp.close();
      if (previous !== undefined) {
        process.env.INTERNAL_API_KEY = previous;
      }
    }
  });

  it('enforces input rules when creating facts', async () => {
    const product = await createProduct();
    const offer = await createOffer(product.id as string);

    const cases: Array<{ payload: unknown; label: string }> = [
      { label: 'no subject', payload: { key: 'k', valueText: 'v' } },
      {
        label: 'both subjects',
        payload: {
          productId: product.id,
          offerId: offer.id,
          key: 'k',
          valueText: 'v',
        },
      },
      { label: 'no value', payload: { productId: product.id, key: 'k' } },
      {
        label: 'superseded initial state',
        payload: {
          productId: product.id,
          key: 'k',
          valueText: 'v',
          status: 'SUPERSEDED',
        },
      },
      {
        label: 'confirmed without source',
        payload: {
          productId: product.id,
          key: 'k',
          valueText: 'v',
          status: 'CONFIRMED',
        },
      },
      {
        label: 'unknown extra field',
        payload: { productId: product.id, key: 'k', valueText: 'v', extra: 1 },
      },
    ];

    for (const testCase of cases) {
      const res = await post('/product-facts', testCase.payload);
      expect(res.statusCode, testCase.label).toBe(400);
    }

    const valid = await post('/product-facts', {
      productId: product.id,
      key: 'thickness_mm',
      valueNumeric: 20,
      status: 'CONFIRMED',
      sourceLabel: 'internal-spec-sheet',
    });
    expect(valid.statusCode).toBe(201);
  });

  it('enforces relations when creating offers, opportunities, and attachments', async () => {
    const missingProduct = await post('/products', {});
    expect(missingProduct.statusCode).toBe(400);

    const noProduct = await post(`/products/${UNKNOWN_UUID}/offers`, {
      name: 'x',
    });
    expect(noProduct.statusCode).toBe(404);

    const product = await createProduct();
    const offer = await createOffer(product.id as string);

    const noOffer = await post('/opportunities', {
      offerId: UNKNOWN_UUID,
      name: 'x',
    });
    expect(noOffer.statusCode).toBe(404);

    const opportunity = await createOpportunity(offer.id as string);

    const noMarket = await post(
      `/opportunities/${opportunity.id}/target-markets`,
      { targetMarketId: UNKNOWN_UUID },
    );
    expect(noMarket.statusCode).toBe(404);

    const market = await createTargetMarket();
    const attached = await post(
      `/opportunities/${opportunity.id}/target-markets`,
      { targetMarketId: market.id },
    );
    expect(attached.statusCode).toBe(201);
    expect(attached.json()).toMatchObject({
      contextVersion: 2,
      targetMarketId: market.id,
    });

    const duplicate = await post(
      `/opportunities/${opportunity.id}/target-markets`,
      { targetMarketId: market.id },
    );
    expect(duplicate.statusCode).toBe(409);
  });

  it('bumps the context version when a target market is attached', async () => {
    const product = await createProduct();
    const offer = await createOffer(product.id as string);
    const opportunity = await createOpportunity(offer.id as string);
    const market = await createTargetMarket();

    const before = await getContext(opportunity.id as string);
    expect(before.statusCode).toBe(200);
    expect((before.json() as Json).contextVersion).toBe(1);

    await post(`/opportunities/${opportunity.id}/target-markets`, {
      targetMarketId: market.id,
    });

    const after = await getContext(opportunity.id as string);
    const body = after.json() as Json;
    expect(body.contextVersion).toBe(2);
    expect(body.targetMarkets).toEqual([
      {
        id: market.id,
        countries: ['LT'],
        industries: [],
        companyTypes: ['sauna manufacturers'],
        buyerTitles: [],
        requirements: [],
        exclusions: [],
      },
    ]);
  });

  it('bumps affected opportunities when a relevant fact is created', async () => {
    const product = await createProduct();
    const offerA = await createOffer(product.id as string, 'Offer A');
    const offerB = await createOffer(product.id as string, 'Offer B');
    const oppA = await createOpportunity(offerA.id as string, 'Opp A');
    const oppB = await createOpportunity(offerB.id as string, 'Opp B');

    // A product fact affects every opportunity of that product.
    const productFact = await post('/product-facts', {
      productId: product.id,
      key: 'thickness_mm',
      valueText: '20',
      status: 'CONFIRMED',
      sourceLabel: 'spec-sheet',
    });
    expect(productFact.statusCode).toBe(201);

    expect(((await getContext(oppA.id as string)).json() as Json).contextVersion).toBe(2);
    expect(((await getContext(oppB.id as string)).json() as Json).contextVersion).toBe(2);

    // An offer fact affects only opportunities of that offer.
    const offerFact = await post('/product-facts', {
      offerId: offerA.id,
      key: 'finish',
      valueText: 'brushed',
    });
    expect(offerFact.statusCode).toBe(201);

    expect(((await getContext(oppA.id as string)).json() as Json).contextVersion).toBe(3);
    expect(((await getContext(oppB.id as string)).json() as Json).contextVersion).toBe(2);
  });

  it('redacts pending and restricted facts and omits superseded facts', async () => {
    const product = await createProduct();
    const offer = await createOffer(product.id as string);
    const opportunity = await createOpportunity(offer.id as string);

    // Confirmed + operational: value and source metadata present.
    const confirmed = (await post('/product-facts', {
      productId: product.id,
      key: 'thickness_mm',
      valueText: '20',
      status: 'CONFIRMED',
      sourceLabel: 'spec-sheet',
    })).json() as Json;

    // Pending + operational: value redacted.
    const pending = (await post('/product-facts', {
      productId: product.id,
      key: 'origin',
      valueText: 'West Africa (must not leak)',
    })).json() as Json;

    // Restricted confirmed: value redacted.
    const restricted = (await post('/product-facts', {
      offerId: offer.id,
      key: 'price_eur',
      valueText: '999 (must not leak)',
      status: 'CONFIRMED',
      sourceLabel: 'internal',
      visibility: 'RESTRICTED',
    })).json() as Json;

    // SUPERSEDED can only be seeded directly (not accepted as an initial state).
    const superseded = await prisma.db.productFact.create({
      data: {
        productId: product.id as string,
        key: 'old_spec',
        valueText: 'superseded (must not appear)',
        status: 'SUPERSEDED',
        sourceLabel: 'legacy',
      },
    });

    const res = await getContext(opportunity.id as string);
    expect(res.statusCode).toBe(200);
    const context = res.json() as {
      schemaVersion: string;
      facts: {
        confirmed: Array<Record<string, unknown>>;
        pending: Array<Record<string, unknown>>;
        restricted: Array<Record<string, unknown>>;
      };
      unknowns: string[];
    };

    expect(context.schemaVersion).toBe('research_context_v1');

    const confirmedFact = context.facts.confirmed.find(
      (fact) => fact.id === confirmed.id,
    );
    expect(confirmedFact).toMatchObject({
      key: 'thickness_mm',
      value: '20',
      sourceLabel: 'spec-sheet',
    });

    const pendingFact = context.facts.pending.find(
      (fact) => fact.id === pending.id,
    );
    expect(pendingFact).toBeDefined();
    expect(pendingFact).not.toHaveProperty('value');
    expect(JSON.stringify(pendingFact)).not.toContain('West Africa');

    const restrictedFact = context.facts.restricted.find(
      (fact) => fact.id === restricted.id,
    );
    expect(restrictedFact).toBeDefined();
    expect(restrictedFact).not.toHaveProperty('value');
    expect(JSON.stringify(restrictedFact)).not.toContain('999');

    const allFactIds = [
      ...context.facts.confirmed,
      ...context.facts.pending,
      ...context.facts.restricted,
    ].map((fact) => fact.id);
    expect(allFactIds).not.toContain(superseded.id);

    expect(context.unknowns).toEqual(
      expect.arrayContaining(['origin', 'price_eur']),
    );
    expect(context.unknowns).not.toContain('thickness_mm');
  });

  it('returns 404 for an unknown opportunity and never leaks secrets', async () => {
    const missing = await getContext(UNKNOWN_UUID);
    expect(missing.statusCode).toBe(404);
    expect(missing.body).not.toContain('postgresql://');
    expect(missing.body).not.toContain(INTERNAL_KEY);

    const product = await createProduct();
    const res = await post('/products', { name: 'Another' });
    expect(res.body).not.toContain(INTERNAL_KEY);
    expect(res.body).not.toContain('postgresql://');
    expect(product.id).toBeTruthy();
  });
});
