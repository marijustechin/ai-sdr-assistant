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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: false },
  );
  await app.init();
  return app;
}

describe('Outreach batch review API (integration)', () => {
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
  ) {
    return app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: { 'x-internal-api-key': INTERNAL_KEY },
    });
  }

  async function seedScope(): Promise<{
    opportunityId: string;
    runId: string;
    productId: string;
    evidenceId: string;
  }> {
    const product = (await api('POST', '/products', { name: 'Abachi' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi',
      })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Abachi LT',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'Lithuania',
        segment: 'resellers',
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
          url: 'https://example.invalid/a',
          evidenceText: 'Sells sauna cladding.',
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
    };
  }

  async function addLead(
    opportunityId: string,
    runId: string,
    evidenceId: string,
    companyName: string,
  ): Promise<Json> {
    const res = await api('POST', `/opportunities/${opportunityId}/leads`, {
      companyName,
      country: 'Lithuania',
      observedActivityText: 'sells sauna cladding',
      observedRoles: ['DISTRIBUTOR'],
      buyerFitHypothesisText: 'May resell the product.',
      researchRunId: runId,
      evidenceId,
    });
    expect(res.statusCode, res.body).toBe(201);
    return res.json() as Json;
  }

  async function qualifyAndContact(
    opportunityId: string,
    lead: Json,
    withContact: boolean,
  ) {
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${lead.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Product-fit: distributor.' },
    );
    if (withContact) {
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
    }
  }

  async function assignSender(productId: string) {
    const profile = (
      await api('POST', '/sender-profiles', {
        label: 'Sales LT',
        senderName: 'Eimantas Doskus',
        senderTitle: 'Sales Manager',
        companyName: 'Premium Timber Hub',
        fromEmail: 'eimantas@example.invalid',
      })
    ).json() as Json;
    await api('PATCH', `/products/${productId}`, {
      outreachSenderProfileId: profile.id as string,
    });
  }

  const batchesUrl = (o: string) => `/opportunities/${o}/outreach-batches`;

  it('generates a batch for eligible leads, counts exclusions/no-recipients, and approves the whole batch', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    const b = await addLead(opportunityId, runId, evidenceId, 'Geras Garas');
    const excluded = await addLead(opportunityId, runId, evidenceId, 'Excluded Co');
    const noRecipient = await addLead(opportunityId, runId, evidenceId, 'No Contact Co');
    await qualifyAndContact(opportunityId, a, true);
    await qualifyAndContact(opportunityId, b, true);
    await qualifyAndContact(opportunityId, excluded, true);
    await qualifyAndContact(opportunityId, noRecipient, false);
    await assignSender(productId);
    // Human exclusion for one company.
    await api(
      'PUT',
      `/opportunities/${opportunityId}/companies/${(excluded.company as Json).id as string}/outreach-decision`,
      { decision: 'DO_NOT_CONTACT' },
    );

    const created = await api('POST', batchesUrl(opportunityId), { language: 'en' });
    expect(created.statusCode).toBe(201);
    const summary = created.json() as Json;
    const counts = summary.counts as Json;
    expect(summary.batch).toBeTruthy();
    expect(counts.eligibleLeads).toBe(3);
    expect(counts.excludedByDecision).toBe(1);
    expect(counts.withoutRecipient).toBe(1);
    expect(counts.generatedDrafts).toBe(2);
    expect((summary.representative as Json[]).length).toBeGreaterThan(0);
    const batchId = (summary.batch as Json).id as string;

    const approved = await api(
      'POST',
      `${batchesUrl(opportunityId)}/${batchId}/approve`,
    );
    expect(approved.statusCode).toBe(201);
    const approvedSummary = approved.json() as Json;
    expect((approvedSummary.batch as Json).status).toBe('APPROVED');
    expect((approvedSummary.counts as Json).approvedDrafts).toBe(2);
    expect((approvedSummary.counts as Json).pendingDrafts).toBe(0);
    // Every included draft is an immutable approved snapshot.
    const drafts = approvedSummary.drafts as Json[];
    expect(drafts.every((d) => d.approvalStatus === 'APPROVED')).toBe(true);
    expect(drafts.every((d) => typeof d.body === 'string' && d.body.length > 0)).toBe(true);
  });

  it('an edited (customized) draft becomes a new pending version and forces batch re-approval', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const a = await addLead(opportunityId, runId, evidenceId, 'Consolva');
    await qualifyAndContact(opportunityId, a, true);
    await assignSender(productId);

    const summary = (
      await api('POST', batchesUrl(opportunityId), { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/approve`);

    const draft = (summary.drafts as Json[])[0] as Json;
    const revised = await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${a.id as string}/outreach-drafts/${draft.id as string}`,
      { canonicalBody: 'Edited by a human.\n\nWould this be relevant?' },
    );
    expect(revised.statusCode).toBe(200);
    const revision = revised.json() as Json;
    expect(revision.customized).toBe(true);
    expect(revision.approvalStatus).toBe('PENDING');

    const after = (
      await api('GET', `${batchesUrl(opportunityId)}/${batchId}`)
    ).json() as Json;
    // Deterministic rule: the batch returns to review.
    expect((after.batch as Json).status).toBe('DRAFT');
    expect((after.counts as Json).pendingDrafts).toBe(1);

    // Regeneration never silently overwrites the customized draft.
    await api('POST', `${batchesUrl(opportunityId)}/${batchId}/regenerate`);
    const afterRegen = (
      await api('GET', `${batchesUrl(opportunityId)}/${batchId}`)
    ).json() as Json;
    expect((afterRegen.counts as Json).pendingDrafts).toBe(1);
    const customized = (afterRegen.drafts as Json[]).find(
      (d) => d.customized === true,
    ) as Json;
    expect(customized.body).toContain('Edited by a human.');
  });
});
