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

describe('Human outreach decisions API (opportunity+company scoped)', () => {
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
    method: 'POST' | 'GET' | 'PATCH' | 'PUT',
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

  async function seedResearch(): Promise<{
    opportunityId: string;
    runId: string;
    productId: string;
    evidenceId: string;
    sourceReferenceId: string;
  }> {
    const product = (await api('POST', '/products', { name: 'Cladding' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Cladding offer',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', { country: 'Lithuania', segment: 'builders' })
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
    return {
      opportunityId: opportunity.id as string,
      runId: run.id as string,
      productId: product.id as string,
      evidenceId: evidence.id as string,
      sourceReferenceId: evidence.sourceReferenceId as string,
    };
  }

  async function createLead(
    opportunityId: string,
    runId: string,
    evidenceId: string,
    companyName: string,
    country: string,
  ): Promise<Json> {
    const res = await api('POST', `/opportunities/${opportunityId}/leads`, {
      companyName,
      country,
      observedActivityText: 'Builds structures.',
      observedRoles: ['BUILDER'],
      buyerFitHypothesisText: 'May use the product.',
      researchRunId: runId,
      evidenceId,
    });
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function createOffering(
    opportunityId: string,
    runId: string,
    evidenceId: string,
    sourceReferenceId: string,
    companyName: string,
    companyLocationText: string,
  ): Promise<Json> {
    const res = await api(
      'POST',
      `/opportunities/${opportunityId}/research-runs/${runId}/offerings`,
      {
        companyText: companyName,
        companyLocationText,
        productText: 'Thermo cladding',
        matchType: 'EXACT_MATCH',
        sourceReferenceId,
        evidenceId,
      },
    );
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  async function makeDraftable(
    opportunityId: string,
    lead: Json,
    productId: string,
  ): Promise<void> {
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${lead.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Product-fit: builder role.' },
    );
    await api('POST', `/companies/${(lead.company as Json).id as string}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email: 'info@example.invalid',
      source: {
        url: 'https://example.invalid/contact',
        title: 'Contact',
        retrievedAt: '2026-09-18T08:00:00.000Z',
        excerptText: 'contact',
      },
    });
    const profile = (
      await api('POST', '/sender-profiles', {
        label: 'Acme Sales',
        senderName: 'Jane Doe',
        companyName: 'Acme Timber',
        fromEmail: 'jane@acme.invalid',
      })
    ).json() as Json;
    await api('PATCH', `/products/${productId}`, {
      outreachSenderProfileId: profile.id as string,
    });
  }

  const companyDecisionUrl = (o: string, c: string) =>
    `/opportunities/${o}/companies/${c}/outreach-decision`;
  const offeringDecisionUrl = (o: string, f: string) =>
    `/opportunities/${o}/research-offerings/${f}/outreach-decision`;
  const draftsUrl = (o: string, l: string) =>
    `/opportunities/${o}/leads/${l}/outreach-drafts`;

  it('requires the internal key', async () => {
    const res = await api(
      'GET',
      companyDecisionUrl(UNKNOWN_UUID, UNKNOWN_UUID),
      undefined,
      null,
    );
    expect(res.statusCode).toBe(401);
  });

  it('stores a company-scoped decision with human provenance (no lead required)', async () => {
    const { opportunityId, runId, evidenceId, sourceReferenceId } =
      await seedResearch();
    await createOffering(
      opportunityId,
      runId,
      evidenceId,
      sourceReferenceId,
      'Consolva',
      'Lithuania',
    );
    const lead = await createLead(
      opportunityId,
      runId,
      evidenceId,
      'Consolva',
      'Lithuania',
    );
    const companyId = (lead.company as Json).id as string;

    const before = await api('GET', companyDecisionUrl(opportunityId, companyId));
    expect(before.statusCode).toBe(200);
    expect(before.json()).toBeNull();

    const set = await api('PUT', companyDecisionUrl(opportunityId, companyId), {
      decision: 'DO_NOT_CONTACT',
      note: 'Asked us to stop.',
    });
    expect(set.statusCode).toBe(200);
    const record = set.json() as Json;
    expect(record.decision).toBe('DO_NOT_CONTACT');
    expect(record.companyId).toBe(companyId);
    expect(record.decidedByKind).toBe('HUMAN');
    expect(typeof record.decidedAt).toBe('string');
  });

  it('excludes a qualified lead from drafting (human exclusion wins)', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedResearch();
    const lead = await createLead(
      opportunityId,
      runId,
      evidenceId,
      'Consolva',
      'Lithuania',
    );
    const leadId = lead.id as string;
    const companyId = (lead.company as Json).id as string;
    await makeDraftable(opportunityId, lead, productId);

    const ok = await api('POST', draftsUrl(opportunityId, leadId), {});
    expect(ok.statusCode).toBe(201);

    for (const decision of [
      'DO_NOT_CONTACT',
      'EXISTING_RELATIONSHIP',
      'NOT_RELEVANT',
      'ALREADY_CONTACTED',
    ] as const) {
      await api('PUT', companyDecisionUrl(opportunityId, companyId), { decision });
      const blocked = await api('POST', draftsUrl(opportunityId, leadId), {});
      expect(blocked.statusCode).toBe(409);
      expect((blocked.json() as Json).error).toBe('lead_excluded_from_outreach');
    }

    await api('PUT', companyDecisionUrl(opportunityId, companyId), {
      decision: 'ELIGIBLE',
    });
    const allowed = await api('POST', draftsUrl(opportunityId, leadId), {});
    expect(allowed.statusCode).toBe(201);
  });

  it('records the decision from a research offering before any lead exists and blocks drafting once the company is a lead', async () => {
    const { opportunityId, runId, productId, evidenceId, sourceReferenceId } =
      await seedResearch();
    const offering = await createOffering(
      opportunityId,
      runId,
      evidenceId,
      sourceReferenceId,
      'Geras Garas',
      'Lithuania',
    );

    // No lead/company exists yet; the offering-read resolves to null.
    const before = await api(
      'GET',
      offeringDecisionUrl(opportunityId, offering.id as string),
    );
    expect(before.statusCode).toBe(200);
    expect(before.json()).toBeNull();

    // A human marks the research-result company EXISTING_RELATIONSHIP.
    const set = await api(
      'PUT',
      offeringDecisionUrl(opportunityId, offering.id as string),
      { decision: 'EXISTING_RELATIONSHIP' },
    );
    expect(set.statusCode).toBe(200);
    const record = set.json() as Json;
    expect(record.decision).toBe('EXISTING_RELATIONSHIP');

    // The offering now resolves to the same decision.
    const offeringRead = await api(
      'GET',
      offeringDecisionUrl(opportunityId, offering.id as string),
    );
    expect((offeringRead.json() as Json).id).toBe(record.id);

    // The company later becomes a lead in the same opportunity...
    const lead = await createLead(
      opportunityId,
      runId,
      evidenceId,
      'Geras Garas',
      'Lithuania',
    );
    const leadId = lead.id as string;
    const companyId = (lead.company as Json).id as string;
    expect(companyId).toBe(record.companyId);

    // ...and the company-scoped read returns the same authoritative record.
    const companyRead = await api(
      'GET',
      companyDecisionUrl(opportunityId, companyId),
    );
    expect((companyRead.json() as Json).id).toBe(record.id);

    // Drafting is blocked by the exclusion entered from research results.
    await makeDraftable(opportunityId, lead, productId);
    const blocked = await api('POST', draftsUrl(opportunityId, leadId), {});
    expect(blocked.statusCode).toBe(409);
    expect((blocked.json() as Json).error).toBe('lead_excluded_from_outreach');
    expect((blocked.json() as Json).decision).toBe('EXISTING_RELATIONSHIP');
  });

  it('keeps one decision per (opportunity, company) across opportunities', async () => {
    const first = await seedResearch();
    const firstLead = await createLead(
      first.opportunityId,
      first.runId,
      first.evidenceId,
      'Consolva',
      'Lithuania',
    );
    const second = await seedResearch();
    const secondLead = await createLead(
      second.opportunityId,
      second.runId,
      second.evidenceId,
      'Consolva',
      'Lithuania',
    );

    await api(
      'PUT',
      companyDecisionUrl(
        first.opportunityId,
        (firstLead.company as Json).id as string,
      ),
      { decision: 'DO_NOT_CONTACT' },
    );

    // The same company in another opportunity is unaffected (opportunity scoped).
    const secondRead = await api(
      'GET',
      companyDecisionUrl(
        second.opportunityId,
        (secondLead.company as Json).id as string,
      ),
    );
    expect(secondRead.json()).toBeNull();
  });
});
