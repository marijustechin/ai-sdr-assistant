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

interface Json {
  [key: string]: unknown;
}

async function createApp(): Promise<NestFastifyApplication> {
  const newApp = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await newApp.init();
  return newApp;
}

describe('Dashboard summary API (integration)', () => {
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

  async function summary(): Promise<Json> {
    const res = await api('GET', '/dashboard/summary');
    expect(res.statusCode).toBe(200);
    return res.json() as Json;
  }

  async function createProduct(name: string): Promise<Json> {
    const res = await api('POST', '/products', { name });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function setLifecycle(productId: string, lifecycleStatus: string) {
    const res = await api('PATCH', `/products/${productId}`, {
      lifecycleStatus,
    });
    expect(res.statusCode).toBe(200);
  }

  /**
   * Minimal drafting context: product → offer → target market → opportunity →
   * run (QUEUED? no — RUNNING) → evidence → claim → lead. Returns the ids the
   * follow-up calls need.
   */
  async function seedDraftingContext(): Promise<{
    opportunityId: string;
    leadId: string;
    companyId: string;
    productId: string;
  }> {
    const product = await createProduct('Cladding');
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Cladding offer',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'Lithuania',
        segment: 'builders',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Cladding opportunity',
      })
    ).json() as Json;
    await api('POST', `/opportunities/${opportunity.id as string}/target-markets`, {
      targetMarketId: market.id,
    });
    const run = (
      await api('POST', `/opportunities/${opportunity.id as string}/research-runs`, {})
    ).json() as Json;
    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/evidence`,
        {
          url: 'https://example.invalid/about',
          evidenceText: 'The company builds structures.',
          verificationStatus: 'VERIFIED',
          retrievedAt: '2026-09-18T07:00:00.000Z',
        },
      )
    ).json() as Json;
    const claim = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/claims`,
        {
          type: 'FACT',
          statement: 'The company builds structures.',
          confidence: 'HIGH',
          evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
        },
      )
    ).json() as Json;
    const lead = (
      await api('POST', `/opportunities/${opportunity.id as string}/leads`, {
        companyName: 'Example Builder',
        country: 'Lithuania',
        observedActivityText: 'Builds structures.',
        observedRoles: ['BUILDER'],
        buyerFitHypothesisText: 'May use the product.',
        researchRunId: run.id as string,
        evidenceId: evidence.id as string,
        claimId: claim.id as string,
      })
    ).json() as Json;
    return {
      opportunityId: opportunity.id as string,
      leadId: lead.id as string,
      companyId: (lead.company as Json).id as string,
      productId: product.id as string,
    };
  }

  it('requires the internal key', async () => {
    const res = await api('GET', '/dashboard/summary', undefined, null);
    expect(res.statusCode).toBe(401);
  });

  it('returns zero counts on an empty system', async () => {
    const body = await summary();
    expect(body).toEqual({
      products: { active: 0, draft: 0, archived: 0, total: 0 },
      researchRuns: { total: 0, completed: 0 },
      leads: { total: 0 },
      outreachDrafts: { total: 0, prepared: 0, blocked: 0 },
    });
  });

  it('counts products per lifecycle (active is not "all products")', async () => {
    const draft = await createProduct('Draft product');
    const active = await createProduct('Active product');
    const archived = await createProduct('Archived product');
    await setLifecycle(active.id as string, 'ACTIVE');
    await setLifecycle(archived.id as string, 'ARCHIVED');
    void draft;

    const body = await summary();
    expect(body.products).toEqual({
      active: 1,
      draft: 1,
      archived: 1,
      total: 3,
    });
  });

  it('reports research runs (total + completed), leads and drafts from real data', async () => {
    const { opportunityId, leadId, companyId, productId } =
      await seedDraftingContext();

    // Second run, left RUNNING, to prove the completed filter.
    await api('POST', `/opportunities/${opportunityId}/research-runs`, {});

    // Complete the first run only.
    const runs = (
      await api('GET', `/opportunities/${opportunityId}/research-runs`)
    ).json() as Array<Json>;
    const running = runs.find((run) => run.status === 'RUNNING') as Json;
    const completed = await api(
      'PATCH',
      `/opportunities/${opportunityId}/research-runs/${running.id as string}`,
      { status: 'COMPLETED' },
    );
    expect(completed.statusCode).toBe(200);

    // Qualify the lead and add a usable recipient.
    const qualified = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${leadId}/qualification`,
      { status: 'QUALIFIED', reason: 'Product-fit: builder role.' },
    );
    expect(qualified.statusCode).toBe(200);
    const contact = await api('POST', `/companies/${companyId}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
      source: {
        url: 'https://example.invalid/contact',
        title: 'Contact',
        retrievedAt: '2026-09-18T08:00:00.000Z',
        excerptText: 'contact',
      },
    });
    expect(contact.statusCode).toBe(201);

    // Assign a sender identity and prepare a draft.
    const profile = await api('POST', '/sender-profiles', {
      label: 'Acme Sales',
      senderName: 'Jane Doe',
      companyName: 'Acme Timber',
      fromEmail: 'jane@acme.invalid',
    });
    expect(profile.statusCode).toBe(201);
    await api('PATCH', `/products/${productId}`, {
      senderProfileId: (profile.json() as Json).id,
    });
    const draft = await api(
      'POST',
      `/opportunities/${opportunityId}/leads/${leadId}/outreach-drafts`,
      {},
    );
    expect(draft.statusCode).toBe(201);
    expect((draft.json() as Json).preparationStatus).toBe('PREPARED');

    const body = await summary();
    expect(body.researchRuns).toEqual({ total: 2, completed: 1 });
    expect(body.leads).toEqual({ total: 1 });
    expect(body.outreachDrafts).toEqual({
      total: 1,
      prepared: 1,
      blocked: 0,
    });
    // The seed product is DRAFT until explicitly activated.
    expect(body.products).toEqual({
      active: 0,
      draft: 1,
      archived: 0,
      total: 1,
    });
  });

  it('does not leak secrets or mailbox credentials in the summary', async () => {
    const body = await summary();
    const serialized = JSON.stringify(body);
    for (const forbidden of [
      'password',
      'ciphertext',
      'smtp',
      'imap',
      'credential',
    ]) {
      expect(serialized.toLowerCase()).not.toContain(forbidden);
    }
  });
});
