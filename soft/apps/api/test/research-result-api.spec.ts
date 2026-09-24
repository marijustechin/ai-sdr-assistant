import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';
import { QuoteFollowUpRepository } from '../src/modules/quote-collection/infrastructure/quote-follow-up.repository.js';

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

describe('Research result finalization + follow-up persistence (integration)', () => {
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
  ) {
    return app.inject({
      method,
      url,
      ...(payload !== undefined ? { payload: payload as object } : {}),
      headers: { 'x-internal-api-key': INTERNAL_KEY },
    });
  }

  interface Ctx {
    opportunityId: string;
    leadId: string;
    productId: string;
    runId: string;
    draftId: string;
  }

  async function seedDraft(): Promise<Ctx> {
    const product = (await api('POST', '/products', { name: 'Abachi' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi cladding',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', { country: 'Lithuania', segment: 'suppliers' })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', {
        offerId: offer.id as string,
        name: 'Abachi sourcing',
      })
    ).json() as Json;
    await api('POST', `/opportunities/${opportunity.id as string}/target-markets`, {
      targetMarketId: market.id as string,
    });
    const run = (
      await api('POST', `/opportunities/${opportunity.id as string}/research-runs`, {})
    ).json() as Json;
    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/evidence`,
        {
          url: 'https://example.invalid/supplier',
          evidenceText: 'Supplier A sells thermo abachi.',
          verificationStatus: 'VERIFIED',
          retrievedAt: '2026-09-20T08:00:00.000Z',
        },
      )
    ).json() as Json;
    const claim = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/claims`,
        {
          type: 'FACT',
          statement: 'Supplier A sells thermo abachi.',
          confidence: 'HIGH',
          evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
        },
      )
    ).json() as Json;
    const lead = (
      await api('POST', `/opportunities/${opportunity.id as string}/leads`, {
        companyName: 'Supplier A',
        country: 'Lithuania',
        observedActivityText: 'Sells thermo abachi cladding.',
        observedRoles: ['RETAILER'],
        buyerFitHypothesisText: 'Could resell thermo abachi cladding.',
        researchRunId: run.id as string,
        evidenceId: evidence.id as string,
        claimId: claim.id as string,
      })
    ).json() as Json;
    const companyId = (lead.company as Json).id as string;
    await api(
      'PATCH',
      `/opportunities/${opportunity.id as string}/leads/${lead.id as string}/qualification`,
      { status: 'QUALIFIED', reason: 'Evidence-backed.' },
    );
    await api('POST', `/companies/${companyId}/contacts`, {
      source: {
        url: 'https://example.invalid/contact',
        title: 'Contact',
        retrievedAt: '2026-09-20T08:30:00.000Z',
        excerptText: 'contact',
      },
      contactType: 'GENERAL_COMPANY',
      email: 'sales@example.invalid',
    });
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Inquiry',
        accountEmail: 'inquiry@example.invalid',
      })
    ).json() as Json;
    const sender = (
      await api('POST', '/sender-profiles', {
        label: 'Inquiry',
        senderName: 'Tomas Berg',
        fromEmail: 'inquiry@example.invalid',
        emailAccountId: account.id as string,
      })
    ).json() as Json;
    const draft = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/leads/${lead.id as string}/price-inquiry-drafts`,
        { productId: product.id as string, senderProfileId: sender.id as string },
      )
    ).json() as Json;
    return {
      opportunityId: opportunity.id as string,
      leadId: lead.id as string,
      productId: product.id as string,
      runId: run.id as string,
      draftId: draft.id as string,
    };
  }

  async function setDraftStatus(draftId: string, status: string) {
    await prisma.db.priceInquiryDraft.update({
      where: { id: draftId },
      data: { status: status as never },
    });
  }

  it('finalizes a run with pending clarifications while the RFQ awaits a reply', async () => {
    const ctx = await seedDraft();
    await setDraftStatus(ctx.draftId, 'SENT');
    const res = await api(
      'POST',
      `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/finalize`,
    );
    expect(res.statusCode).toBe(201);
    const result = res.json() as Json;
    expect(result.status).toBe('COMPLETED_WITH_PENDING_CLARIFICATIONS');
    const counts = result.counts as Json;
    expect(counts.pendingClarifications).toBe(1);
    expect(counts.evidenceCount).toBe(1);
    const inquiries = result.inquiries as Json[];
    expect(inquiries).toHaveLength(1);
    expect(inquiries[0]!.clarificationState).toBe('AWAITING_REPLY');
    expect(inquiries[0]!.companyName).toBe('Supplier A');
  });

  it('treats NO_RESPONSE as not pending and preserves the inquiry', async () => {
    const ctx = await seedDraft();
    await setDraftStatus(ctx.draftId, 'NO_RESPONSE');
    const res = await api(
      'GET',
      `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/result`,
    );
    const result = res.json() as Json;
    const counts = result.counts as Json;
    expect(counts.pendingClarifications).toBe(0);
    expect(counts.noResponseInquiries).toBe(1);
    expect((result.inquiries as Json[])[0]!.clarificationState).toBe(
      'NO_RESPONSE',
    );
  });

  it('counts a reply without a usable price as a reply, not a quote', async () => {
    const ctx = await seedDraft();
    await setDraftStatus(ctx.draftId, 'REPLY_RECEIVED');
    const res = await api(
      'GET',
      `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/result`,
    );
    const result = res.json() as Json;
    const counts = result.counts as Json;
    expect(counts.pendingClarifications).toBe(0);
    expect(counts.repliesReceived).toBe(1);
    expect(counts.quotesReceived).toBe(0);
    expect((result.inquiries as Json[])[0]!.clarificationState).toBe(
      'REPLY_RECEIVED',
    );
  });

  it('is idempotent: re-finalizing preserves the frozen completion time', async () => {
    const ctx = await seedDraft();
    const first = (
      await api(
        'POST',
        `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/finalize`,
      )
    ).json() as Json;
    const second = (
      await api(
        'POST',
        `/opportunities/${ctx.opportunityId}/research-runs/${ctx.runId}/finalize`,
      )
    ).json() as Json;
    expect(second.researchCompletedAt).toBe(first.researchCompletedAt);
  });

  it('persists a DB-backed follow-up schedule that survives (listDue finds it)', async () => {
    const ctx = await seedDraft();
    const repo = app.get(QuoteFollowUpRepository);
    const past = new Date(Date.now() - 60_000);
    await repo.ensure({
      priceInquiryDraftId: ctx.draftId,
      outboundMessageId: null,
      emailAccountId: null,
      opportunityId: ctx.opportunityId,
      leadId: ctx.leadId,
      nextCheckAt: past,
    });
    const due = await repo.listDue(new Date(), 10);
    expect(due.map((row) => row.priceInquiryDraftId)).toContain(ctx.draftId);
    // Idempotent: a second ensure does not create a duplicate.
    await repo.ensure({
      priceInquiryDraftId: ctx.draftId,
      outboundMessageId: null,
      emailAccountId: null,
      opportunityId: ctx.opportunityId,
      leadId: ctx.leadId,
      nextCheckAt: future(),
    });
    expect(await prisma.db.quoteFollowUp.count()).toBe(1);
  });
});

function future(): Date {
  return new Date(Date.now() + 3_600_000);
}
