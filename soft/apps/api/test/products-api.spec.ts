import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { ProductResponseSchema } from '@ai-sdr/contracts';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

interface Json {
  [key: string]: unknown;
}

describe('Products read/update API (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter(),
      { logger: false },
    );
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma.db);
  });

  async function request(
    method: 'GET' | 'POST' | 'PATCH',
    url: string,
    options: { payload?: unknown; key?: string | null } = {},
  ) {
    const key =
      options.key === undefined ? INTERNAL_KEY : options.key;
    return app.inject({
      method,
      url,
      headers: key === null ? {} : { 'x-internal-api-key': key },
      ...(options.payload === undefined
        ? {}
        : { payload: options.payload as object }),
    });
  }

  async function createProduct(
    payload: Record<string, unknown> = { name: 'Abachi' },
  ): Promise<Json> {
    const res = await request('POST', '/products', { payload });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  it('requires the internal key on product read/update routes', async () => {
    const cases: Array<{
      method: 'GET' | 'PATCH';
      url: string;
      payload?: unknown;
    }> = [
      { method: 'GET', url: '/products' },
      { method: 'GET', url: `/products/${UNKNOWN_UUID}` },
      { method: 'GET', url: `/products/${UNKNOWN_UUID}/offers` },
      { method: 'GET', url: `/products/${UNKNOWN_UUID}/opportunities` },
      { method: 'PATCH', url: `/products/${UNKNOWN_UUID}`, payload: { name: 'x' } },
    ];

    for (const testCase of cases) {
      const missing = await request(testCase.method, testCase.url, {
        key: null,
        ...(testCase.payload === undefined ? {} : { payload: testCase.payload }),
      });
      expect(missing.statusCode, `${testCase.method} ${testCase.url}`).toBe(401);

      const wrong = await request(testCase.method, testCase.url, {
        key: 'wrong-key-value-000000000000',
        ...(testCase.payload === undefined ? {} : { payload: testCase.payload }),
      });
      expect(wrong.statusCode, `${testCase.method} ${testCase.url}`).toBe(401);
    }
  });

  it('lists products most recently updated first, matching the response contract', async () => {
    const empty = await request('GET', '/products');
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual([]);

    const first = await createProduct({ name: 'Abachi' });
    const second = await createProduct({
      name: 'Birch',
      category: 'hardwood timber',
    });
    const third = await createProduct({ name: 'Cedar', lifecycleStatus: 'ACTIVE' });

    // Touching the first product makes it the most recently updated.
    const patched = await request('PATCH', `/products/${first.id}`, {
      payload: { description: 'Updated summary' },
    });
    expect(patched.statusCode).toBe(200);

    const list = await request('GET', '/products');
    expect(list.statusCode).toBe(200);
    const body = list.json() as Json[];
    expect(body).toHaveLength(3);
    expect(body.map((product) => product.id)).toEqual([
      first.id,
      third.id,
      second.id,
    ]);
    for (const product of body) {
      expect(ProductResponseSchema.safeParse(product).success).toBe(true);
    }
  });

  it('reads a single product and returns the standard not-found shape', async () => {
    const created = await createProduct({
      name: 'Abachi',
      scientificName: 'Triplochiton scleroxylon',
      category: 'hardwood timber',
      description: 'Heat-treated tropical hardwood.',
    });

    const found = await request('GET', `/products/${created.id}`);
    expect(found.statusCode).toBe(200);
    const body = found.json() as Json;
    expect(ProductResponseSchema.safeParse(body).success).toBe(true);
    expect(body).toMatchObject({
      id: created.id,
      name: 'Abachi',
      scientificName: 'Triplochiton scleroxylon',
      category: 'hardwood timber',
      description: 'Heat-treated tropical hardwood.',
      lifecycleStatus: 'DRAFT',
    });

    const missing = await request('GET', `/products/${UNKNOWN_UUID}`);
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'product_not_found' });

    const invalid = await request('GET', '/products/not-a-uuid');
    expect(invalid.statusCode).toBe(400);
  });

  it('applies partial updates to individual editable fields and lifecycle', async () => {
    const created = await createProduct({ name: 'Abachi' });

    const noop = await request('PATCH', `/products/${created.id}`, {
      payload: {},
    });
    expect(noop.statusCode).toBe(200);
    expect(noop.json()).toMatchObject({ name: 'Abachi', lifecycleStatus: 'DRAFT' });

    const nameOnly = await request('PATCH', `/products/${created.id}`, {
      payload: { name: 'Thermo Abachi' },
    });
    expect(nameOnly.statusCode).toBe(200);
    const afterName = nameOnly.json() as Json;
    expect(ProductResponseSchema.safeParse(afterName).success).toBe(true);
    expect(afterName).toMatchObject({
      name: 'Thermo Abachi',
      category: null,
      lifecycleStatus: 'DRAFT',
    });

    const setText = await request('PATCH', `/products/${created.id}`, {
      payload: {
        scientificName: 'Triplochiton scleroxylon',
        description: 'Summary',
        category: 'hardwood timber',
      },
    });
    expect(setText.statusCode).toBe(200);
    expect(setText.json()).toMatchObject({
      scientificName: 'Triplochiton scleroxylon',
      description: 'Summary',
      category: 'hardwood timber',
    });

    const statusOnly = await request('PATCH', `/products/${created.id}`, {
      payload: { lifecycleStatus: 'ACTIVE' },
    });
    expect(statusOnly.statusCode).toBe(200);
    expect(statusOnly.json()).toMatchObject({
      name: 'Thermo Abachi',
      lifecycleStatus: 'ACTIVE',
    });

    const cleared = await request('PATCH', `/products/${created.id}`, {
      payload: { scientificName: null, description: null, category: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json()).toMatchObject({
      scientificName: null,
      description: null,
      category: null,
    });
  });

  it('rejects invalid lifecycle values, unknown fields, and bad ids', async () => {
    const created = await createProduct({ name: 'Abachi' });

    const invalidPayloads = [
      { lifecycleStatus: 'PAUSED' },
      { lifecycleStatus: 'RETIRED' },
      { name: '' },
      { category: 123 },
      { unexpected: true },
    ];

    for (const payload of invalidPayloads) {
      const res = await request('PATCH', `/products/${created.id}`, {
        payload,
      });
      expect(res.statusCode, JSON.stringify(payload)).toBe(400);
    }

    const unchanged = await request('GET', `/products/${created.id}`);
    expect(unchanged.json()).toMatchObject({ name: 'Abachi', lifecycleStatus: 'DRAFT' });

    const badId = await request('PATCH', '/products/not-a-uuid', {
      payload: { name: 'x' },
    });
    expect(badId.statusCode).toBe(400);
  });

  it('returns the standard not-found shape when updating a missing product', async () => {
    const res = await request('PATCH', `/products/${UNKNOWN_UUID}`, {
      payload: { name: 'x' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'product_not_found' });
  });

  it('discovers offers, opportunities, and attached target markets from a product id', async () => {
    const product = await createProduct({ name: 'Abachi' });
    const offerRes = await request('POST', `/products/${product.id}/offers`, {
      payload: { name: 'Thermo Abachi STS 3D' },
    });
    expect(offerRes.statusCode).toBe(201);
    const offer = offerRes.json() as Json;

    const marketRes = await request('POST', '/target-markets', {
      payload: { country: 'LT', segment: 'sauna manufacturers' },
    });
    expect(marketRes.statusCode).toBe(201);
    const market = marketRes.json() as Json;

    const opportunityRes = await request('POST', '/opportunities', {
      payload: { offerId: offer.id, name: 'Thermo Abachi cladding' },
    });
    expect(opportunityRes.statusCode).toBe(201);
    const opportunity = opportunityRes.json() as Json;

    const attachRes = await request(
      'POST',
      `/opportunities/${opportunity.id}/target-markets`,
      { payload: { targetMarketId: market.id } },
    );
    expect(attachRes.statusCode).toBe(201);

    const offers = await request('GET', `/products/${product.id}/offers`);
    expect(offers.statusCode).toBe(200);
    expect(offers.json()).toEqual([
      {
        id: offer.id,
        productId: product.id,
        name: 'Thermo Abachi STS 3D',
        commercialStatus: 'DRAFT',
      },
    ]);

    const opportunities = await request(
      'GET',
      `/products/${product.id}/opportunities`,
    );
    expect(opportunities.statusCode).toBe(200);
    const discovered = opportunities.json() as Json[];
    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toMatchObject({
      id: opportunity.id,
      offerId: offer.id,
      name: 'Thermo Abachi cladding',
      lifecycleStatus: 'DRAFT',
      contextVersion: 2,
    });
    expect(discovered[0]?.targetMarkets).toEqual([
      {
        id: market.id,
        country: 'LT',
        segment: 'sauna manufacturers',
        lifecycleStatus: 'ACTIVE',
      },
    ]);
  });

  it('returns empty discovery results for a product with no offers', async () => {
    const product = await createProduct({ name: 'Abachi' });

    const offers = await request('GET', `/products/${product.id}/offers`);
    expect(offers.statusCode).toBe(200);
    expect(offers.json()).toEqual([]);

    const opportunities = await request(
      'GET',
      `/products/${product.id}/opportunities`,
    );
    expect(opportunities.statusCode).toBe(200);
    expect(opportunities.json()).toEqual([]);
  });

  it('returns product_not_found for discovery on an unknown product', async () => {
    const offers = await request('GET', `/products/${UNKNOWN_UUID}/offers`);
    expect(offers.statusCode).toBe(404);
    expect(offers.json()).toEqual({ error: 'product_not_found' });

    const opportunities = await request(
      'GET',
      `/products/${UNKNOWN_UUID}/opportunities`,
    );
    expect(opportunities.statusCode).toBe(404);
    expect(opportunities.json()).toEqual({ error: 'product_not_found' });
  });
});
