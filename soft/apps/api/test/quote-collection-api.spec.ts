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

describe('Quote collection API (integration, no live mailbox)', () => {
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

  interface Context {
    opportunityId: string;
    leadId: string;
    companyId: string;
    productId: string;
  }

  async function seedContext(): Promise<Context> {
    const product = (
      await api('POST', '/products', { name: 'Abachi', category: 'Timber' })
    ).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, {
        name: 'Thermo Abachi cladding',
      })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', {
        country: 'Lithuania',
        segment: 'suppliers',
      })
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
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs`,
        {},
      )
    ).json() as Json;
    const evidence = (
      await api(
        'POST',
        `/opportunities/${opportunity.id as string}/research-runs/${run.id as string}/evidence`,
        {
          url: 'https://example.invalid/supplier',
          evidenceText: 'Supplier A sells thermo-treated abachi.',
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
          statement: 'Supplier A sells thermo-treated abachi cladding.',
          confidence: 'HIGH',
          evidence: [{ evidenceId: evidence.id as string, stance: 'SUPPORTS' }],
        },
      )
    ).json() as Json;
    const lead = (
      await api('POST', `/opportunities/${opportunity.id as string}/leads`, {
        companyName: 'Supplier A',
        country: 'Lithuania',
        observedActivityText: 'Manufactures thermo-treated timber.',
        observedRoles: ['MANUFACTURER'],
        buyerFitHypothesisText: 'Could quote abachi cladding.',
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

  async function qualify(opportunityId: string, leadId: string) {
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${leadId}/qualification`,
      { status: 'QUALIFIED', reason: 'Supplier fit.' },
    );
  }

  async function addContact(companyId: string, email: string) {
    await api('POST', `/companies/${companyId}/contacts`, {
      source: {
        url: 'https://example.invalid/contact',
        title: 'Contact',
        retrievedAt: '2026-09-20T08:30:00.000Z',
        excerptText: 'contact',
      },
      contactType: 'GENERAL_COMPANY',
      email,
    });
  }

  /** A sender profile linked to an email account (no password: no transport). */
  async function linkSender(): Promise<Json> {
    const account = (
      await api('POST', '/email-accounts', {
        label: 'Inquiry mailbox',
        accountEmail: 'inquiry@example.invalid',
      })
    ).json() as Json;
    return (
      await api('POST', '/sender-profiles', {
        label: 'Inquiry',
        senderName: 'Tomas Berg',
        fromEmail: 'inquiry@example.invalid',
        emailAccountId: account.id as string,
      })
    ).json() as Json;
  }

  async function createDraft(
    ctx: Context,
    senderProfileId: string,
  ): Promise<Json> {
    const res = await api(
      'POST',
      `/opportunities/${ctx.opportunityId}/leads/${ctx.leadId}/price-inquiry-drafts`,
      { productId: ctx.productId, senderProfileId },
    );
    expect(res.statusCode).toBe(201);
    return res.json() as Json;
  }

  function sendUrl(ctx: Context, draftId: string): string {
    return `/opportunities/${ctx.opportunityId}/leads/${ctx.leadId}/price-inquiry-drafts/${draftId}/send`;
  }
  function checkUrl(ctx: Context, draftId: string): string {
    return `/opportunities/${ctx.opportunityId}/leads/${ctx.leadId}/price-inquiry-drafts/${draftId}/check-replies`;
  }
  function collectionUrl(ctx: Context): string {
    return `/opportunities/${ctx.opportunityId}/leads/${ctx.leadId}/quote-collection`;
  }

  it('requires the internal key on every quote-collection endpoint', async () => {
    const res = await api(
      'GET',
      `/opportunities/${UNKNOWN_UUID}/leads/${UNKNOWN_UUID}/quote-collection`,
      undefined,
      null,
    );
    expect(res.statusCode).toBe(401);
  });

  it('rejects an unconfirmed send before any transport is reached', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, 'supplier@example.invalid');
    const sender = await linkSender();
    const draft = await createDraft(ctx, sender.id as string);

    const missingConfirm = await api(
      'POST',
      sendUrl(ctx, draft.id as string),
      {},
    );
    expect(missingConfirm.statusCode).toBe(400);

    const falseConfirm = await api('POST', sendUrl(ctx, draft.id as string), {
      confirm: false,
    });
    expect(falseConfirm.statusCode).toBe(400);
    expect(
      await prisma.db.quoteOutboundMessage.count(),
    ).toBe(0);
  });

  it('404s an unknown draft and 409s a draft that is not reviewable', async () => {
    const ctx = await seedContext();
    const missing = await api('POST', sendUrl(ctx, UNKNOWN_UUID), {
      confirm: true,
    });
    expect(missing.statusCode).toBe(404);

    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, 'supplier@example.invalid');
    const sender = await linkSender();
    const draft = await createDraft(ctx, sender.id as string);
    await prisma.db.priceInquiryDraft.update({
      where: { id: draft.id as string },
      data: { status: 'SENT' },
    });
    const already = await api('POST', sendUrl(ctx, draft.id as string), {
      confirm: true,
    });
    expect(already.statusCode).toBe(409);
    expect((already.json() as Json).error).toBe('rfq_already_sent');
  });

  it('returns a safe structured error when the mailbox cannot send', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, 'supplier@example.invalid');
    const sender = await linkSender();
    const draft = await createDraft(ctx, sender.id as string);

    // The linked account has no stored password, so no connection is attempted.
    const res = await api('POST', sendUrl(ctx, draft.id as string), {
      confirm: true,
    });
    expect(res.statusCode).toBe(502);
    const body = res.json() as Json;
    expect(body.error).toBe('rfq_send_failed');
    expect(typeof body.code).toBe('string');
    expect(JSON.stringify(body)).not.toContain('password');

    const outbound = await prisma.db.quoteOutboundMessage.findFirstOrThrow();
    expect(outbound.submissionStatus).toBe('FAILED');
    expect(outbound.failureCode).toBe('mailbox_credentials_missing');
    const stored = await prisma.db.priceInquiryDraft.findUniqueOrThrow({
      where: { id: draft.id as string },
    });
    expect(stored.status).toBe('READY_FOR_HUMAN_REVIEW');
  });

  it('keeps the sent snapshot immutable when the draft is edited later', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, 'supplier@example.invalid');
    const sender = await linkSender();
    const draft = await createDraft(ctx, sender.id as string);

    // Persist an outbound directly (no transport) to model a sent message.
    await prisma.db.quoteOutboundMessage.create({
      data: {
        priceInquiryDraftId: draft.id as string,
        opportunityId: ctx.opportunityId,
        leadId: ctx.leadId,
        companyId: ctx.companyId,
        productId: ctx.productId,
        senderProfileId: sender.id as string,
        emailAccountId: (sender.emailAccountId as string) ?? null,
        fromEmail: 'inquiry@example.invalid',
        recipientEmail: 'supplier@example.invalid',
        subject: 'Price inquiry: Abachi',
        body: 'Original body.',
        messageId: '<immutable@example.invalid>',
        submissionStatus: 'SUBMITTED',
        sentAt: new Date(),
      },
    });

    const patch = await api(
      'PATCH',
      `/opportunities/${ctx.opportunityId}/leads/${ctx.leadId}/price-inquiry-drafts/${draft.id as string}`,
      { subject: 'Edited subject', body: 'Edited body.' },
    );
    expect(patch.statusCode).toBe(200);

    const outbound = await prisma.db.quoteOutboundMessage.findFirstOrThrow();
    expect(outbound.subject).toBe('Price inquiry: Abachi');
    expect(outbound.body).toBe('Original body.');
    expect(outbound.messageId).toBe('<immutable@example.invalid>');
  });

  it('refuses to check replies before the RFQ was sent', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, 'supplier@example.invalid');
    const sender = await linkSender();
    const draft = await createDraft(ctx, sender.id as string);

    const res = await api('POST', checkUrl(ctx, draft.id as string));
    expect(res.statusCode).toBe(409);
    expect((res.json() as Json).error).toBe('rfq_not_sent');
  });

  it('reports the market-research price state of each draft', async () => {
    const ctx = await seedContext();
    await qualify(ctx.opportunityId, ctx.leadId);
    await addContact(ctx.companyId, 'supplier@example.invalid');
    const sender = await linkSender();
    const draft = await createDraft(ctx, sender.id as string);

    let list = (await api('GET', collectionUrl(ctx))).json() as Json[];
    expect(list).toHaveLength(1);
    expect(list[0]!.marketResearchState).toBe('PRICE_INQUIRY_PREPARED');
    expect(list[0]!.outbound).toBeNull();

    await prisma.db.priceInquiryDraft.update({
      where: { id: draft.id as string },
      data: { status: 'SENT' },
    });
    await prisma.db.quoteOutboundMessage.create({
      data: {
        priceInquiryDraftId: draft.id as string,
        opportunityId: ctx.opportunityId,
        leadId: ctx.leadId,
        companyId: ctx.companyId,
        productId: ctx.productId,
        fromEmail: 'inquiry@example.invalid',
        recipientEmail: 'supplier@example.invalid',
        subject: 'Price inquiry: Abachi',
        body: 'Please quote.',
        messageId: '<state@example.invalid>',
        submissionStatus: 'SUBMITTED',
        sentAt: new Date(),
      },
    });

    list = (await api('GET', collectionUrl(ctx))).json() as Json[];
    expect(list[0]!.marketResearchState).toBe('AWAITING_REPLY');
    expect((list[0]!.outbound as Json).messageId).toBe(
      '<state@example.invalid>',
    );
  });
});
