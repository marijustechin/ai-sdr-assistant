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

describe('Research offerings API (integration)', () => {
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
    method: 'POST' | 'GET',
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

  async function seedRun(): Promise<{ opportunityId: string; runId: string }> {
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
        segment: 'sauna/bathhouse cladding',
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
    const run = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs`,
        {},
      )
    ).json() as Json;
    return {
      opportunityId: opportunity.id as string,
      runId: run.id as string,
    };
  }

  async function addEvidence(
    opportunityId: string,
    runId: string,
  ): Promise<Json> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/evidence`,
      {
        url: 'https://example.invalid/supplier-a',
        evidenceText: 'Supplier A lists thermo-treated abachi cladding.',
        verificationStatus: 'VERIFIED',
        retrievedAt: '2026-09-15T09:00:00.000Z',
      },
    );
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  function offeringsUrl(opportunityId: string, runId: string): string {
    return `/opportunities/${opportunityId}/research-runs/${runId}/offerings`;
  }

  it('requires the internal key', async () => {
    const res = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/research-runs/${UNKNOWN_UUID}/offerings`,
      undefined,
      null,
    );
    expect(res.statusCode).toBe(401);
  });

  it('creates a provenance-linked offering and lists it with its source', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId);

    const created = await api('POST', offeringsUrl(opportunityId, runId), {
      companyText: 'Coyletimber Ltd',
      companyLocationText: 'GB',
      marketServedText: 'GB',
      productText: 'Thermo Ayous Cladding',
      applicationText: 'exterior/facade cladding',
      treatmentText: 'Thermal modification 190-215 C',
      priceText: 'GBP 7.00 per metre ex VAT (inc VAT GBP 8.40)',
      priceCurrency: 'GBP',
      priceUnit: 'per metre',
      vatStatus: 'EXCLUDED',
      priceBasis: 'RETAIL_LIST',
      sampleKind: 'FULL_PRODUCT',
      matchType: 'EXACT_MATCH',
      sourceReferenceId: evidence.sourceReferenceId,
      evidenceId: evidence.id,
    });
    expect(created.statusCode).toBe(201);
    const body = created.json() as Json;
    expect(body.companyText).toBe('Coyletimber Ltd');
    expect(body.matchType).toBe('EXACT_MATCH');
    expect((body.evidence as Json).sourceReferenceId).toBe(
      evidence.sourceReferenceId,
    );

    const list = await api('GET', offeringsUrl(opportunityId, runId));
    expect(list.statusCode).toBe(200);
    const items = list.json() as Array<Json>;
    expect(items).toHaveLength(1);
    expect((items[0]?.evidence as Json).source).toBeTruthy();
    expect(items[0]?.priceText).toBe(
      'GBP 7.00 per metre ex VAT (inc VAT GBP 8.40)',
    );
  });

  it('is idempotent: the same observation is not duplicated', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId);
    const payload = {
      companyText: 'Pirtele.lt',
      productText: 'Termo abachi dailylentes STS 18x140',
      priceText: '69.00 EUR/m2',
      sourceReferenceId: evidence.sourceReferenceId,
      evidenceId: evidence.id,
      matchType: 'EXACT_MATCH',
    };

    const first = await api('POST', offeringsUrl(opportunityId, runId), payload);
    const second = await api('POST', offeringsUrl(opportunityId, runId), payload);
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect((second.json() as Json).id).toBe((first.json() as Json).id);

    const list = (
      await api('GET', offeringsUrl(opportunityId, runId))
    ).json() as Array<Json>;
    expect(list).toHaveLength(1);
  });

  it('rejects invalid provenance and non-current claims', async () => {
    const runA = await seedRun();
    const runB = await seedRun();
    const evidence = await addEvidence(runA.opportunityId, runA.runId);

    const crossRun = await api('POST', offeringsUrl(runA.opportunityId, runA.runId), {
      companyText: 'X',
      sourceReferenceId: evidence.sourceReferenceId,
      evidenceId: evidence.id,
    });
    // evidence belongs to run A; using it against run B fails.
    const wrongRun = await api(
      'POST',
      offeringsUrl(runB.opportunityId, runB.runId),
      {
        companyText: 'X',
        sourceReferenceId: evidence.sourceReferenceId,
        evidenceId: evidence.id,
      },
    );
    expect(crossRun.statusCode).toBe(201);
    expect(wrongRun.statusCode).toBe(400);
    expect((wrongRun.json() as Json).error).toBe(
      'offering_evidence_not_in_run',
    );

    const mismatch = await api('POST', offeringsUrl(runA.opportunityId, runA.runId), {
      companyText: 'Y',
      sourceReferenceId: UNKNOWN_UUID,
      evidenceId: evidence.id,
    });
    expect(mismatch.statusCode).toBe(400);
    expect((mismatch.json() as Json).error).toBe('offering_source_mismatch');

    const noProvenance = await api(
      'POST',
      offeringsUrl(runA.opportunityId, runA.runId),
      { companyText: 'Z' },
    );
    expect(noProvenance.statusCode).toBe(400);
  });

  it('round-trips non-ASCII text through the API unchanged', async () => {
    const { opportunityId, runId } = await seedRun();
    const evidence = await addEvidence(opportunityId, runId);

    const lithuanian = 'Termiškai apdorotas abachi, ąžuolas — €3,91 (su PVM)';
    const queryText = 'lämpökäsitelty abachi saunan paneeli — Suomi';

    const query = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/queries`,
      { queryText, provider: 'exa', status: 'SUCCEEDED', resultCount: 1 },
    );
    expect(query.statusCode).toBe(201);

    const offering = await api('POST', offeringsUrl(opportunityId, runId), {
      companyText: lithuanian,
      priceText: lithuanian,
      priceCurrency: 'EUR',
      sourceReferenceId: evidence.sourceReferenceId,
      evidenceId: evidence.id,
    });
    expect(offering.statusCode).toBe(201);

    const queries = (
      await api(
        'GET',
        `/opportunities/${opportunityId}/research-runs/${runId}/queries`,
      )
    ).json() as Array<Json>;
    expect(queries[0]?.queryText).toBe(queryText);

    const offerings = (
      await api('GET', offeringsUrl(opportunityId, runId))
    ).json() as Array<Json>;
    expect(offerings[0]?.companyText).toBe(lithuanian);
    expect(offerings[0]?.priceText).toBe(lithuanian);
  });
});
