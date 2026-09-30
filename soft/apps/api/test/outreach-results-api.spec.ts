import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@ai-sdr/database';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './helpers/database.js';
import { OutreachDrafterService } from '../src/modules/outreach-drafter/application/outreach-drafter.service.js';
import { LeadDiscovererService } from '../src/modules/lead-discoverer/application/lead-discoverer.service.js';
import { OutreachOutboundRepository } from '../src/modules/outreach-sender/infrastructure/outreach-outbound.repository.js';
import { OutreachTestDeliveryRepository } from '../src/modules/outreach-sender/infrastructure/outreach-test-delivery.repository.js';
import { OutreachSenderService } from '../src/modules/outreach-sender/application/outreach-sender.service.js';
import { OutreachReplyRepository } from '../src/modules/outreach-results/infrastructure/outreach-reply.repository.js';
import { OutreachResultsService } from '../src/modules/outreach-results/application/outreach-results.service.js';
import { buildRawMime } from '../src/modules/email-accounts/domain/mime.js';
import {
  InboundMailPort,
  OutboundMailPort,
  type InboundMailCandidate,
  type OutboundMailResult,
  type OutboundMultipartResult,
  type OutboundMultipartSpec,
} from '../src/modules/email-accounts/domain/messaging.js';

const INTERNAL_KEY =
  process.env.INTERNAL_API_KEY ?? 'integration-test-internal-key-0001';

interface Json {
  [key: string]: unknown;
}

class FakeSmtp extends OutboundMailPort {
  async send(): Promise<OutboundMailResult> {
    throw new Error('send() not used');
  }
  async sendMultipart(
    _accountId: string,
    spec: OutboundMultipartSpec,
  ): Promise<OutboundMultipartResult> {
    return {
      messageId: spec.messageId,
      providerMessageId: `prov${spec.messageId}`,
      raw: buildRawMime(spec),
    };
  }
}

class FakeInbound extends InboundMailPort {
  candidates: InboundMailCandidate[] = [];
  appends = 0;
  async scanRecent(): Promise<InboundMailCandidate[]> {
    return this.candidates;
  }
  async appendToSent(): Promise<void> {
    this.appends += 1;
  }
}

function candidate(
  overrides: Partial<InboundMailCandidate>,
): InboundMailCandidate {
  return {
    mailboxUid: '1:1',
    providerMessageId: null,
    inReplyTo: null,
    references: [],
    fromEmail: null,
    toEmail: null,
    subject: null,
    receivedAt: new Date(),
    text: '',
    ...overrides,
  };
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

describe('Outreach results / campaign summary (integration, fake transport)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let drafter: OutreachDrafterService;
  let leads: LeadDiscovererService;
  let outboundRepo: OutreachOutboundRepository;
  let replyRepo: OutreachReplyRepository;
  let sender: OutreachSenderService;
  let smtp: FakeSmtp;
  let inbound: FakeInbound;
  let results: OutreachResultsService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    drafter = app.get(OutreachDrafterService);
    leads = app.get(LeadDiscovererService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma.db);
    smtp = new FakeSmtp();
    inbound = new FakeInbound();
    outboundRepo = new OutreachOutboundRepository(prisma);
    replyRepo = new OutreachReplyRepository(prisma);
    sender = new OutreachSenderService(
      outboundRepo,
      drafter,
      smtp,
      inbound,
      new OutreachTestDeliveryRepository(prisma),
    );
    results = new OutreachResultsService(
      replyRepo,
      drafter,
      sender,
      leads,
      inbound,
    );
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

  async function seedScope() {
    const product = (await api('POST', '/products', { name: 'Abachi' })).json() as Json;
    const offer = (
      await api('POST', `/products/${product.id as string}/offers`, { name: 'Thermo Abachi' })
    ).json() as Json;
    const opportunity = (
      await api('POST', '/opportunities', { offerId: offer.id as string, name: 'Abachi LT' })
    ).json() as Json;
    const market = (
      await api('POST', '/target-markets', { country: 'Lithuania', segment: 'resellers' })
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
    email: string,
  ): Promise<Json> {
    const lead = (
      await api('POST', `/opportunities/${opportunityId}/leads`, {
        companyName,
        country: 'Lithuania',
        observedActivityText: 'Sells sauna cladding and bench timber',
        observedRoles: ['RETAILER'],
        buyerFitHypothesisText: 'May resell the product.',
        researchRunId: runId,
        evidenceId,
      })
    ).json() as Json;
    await api('PATCH', `/opportunities/${opportunityId}/leads/${lead.id as string}/qualification`, {
      status: 'QUALIFIED',
      reason: 'Product-fit reseller.',
    });
    await api('POST', `/companies/${(lead.company as Json).id as string}/contacts`, {
      contactType: 'GENERAL_COMPANY',
      email,
      source: {
        url: 'https://example.invalid/contact',
        title: 'Contact',
        retrievedAt: '2026-09-18T08:00:00.000Z',
        excerptText: 'contact',
      },
    });
    return lead;
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
    const account = (
      await api('POST', '/email-accounts', {
        label: 'LT Mail',
        accountEmail: 'eimantas@example.invalid',
      })
    ).json() as Json;
    await api('PATCH', `/sender-profiles/${profile.id as string}`, {
      emailAccountId: account.id,
    });
    await api('PATCH', `/products/${productId}`, {
      outreachSenderProfileId: profile.id as string,
    });
  }

  async function sendBatch(count = 3) {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    const emails = ['info@alpha.invalid', 'info@beta.invalid', 'info@gamma.invalid'];
    for (let i = 0; i < count; i += 1) {
      await addLead(opportunityId, runId, evidenceId, `Co ${i + 1}`, emails[i]!);
    }
    await assignSender(productId);
    const summary = (
      await api('POST', `/opportunities/${opportunityId}/outreach-batches`, {
        language: 'lt',
        pacingSeconds: 0,
      })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    await api('POST', `/opportunities/${opportunityId}/outreach-batches/${batchId}/approve`);
    await sender.startSending(opportunityId, batchId);
    for (let i = 0; i < count * 4; i += 1) {
      const outcome = await sender.processDue(10);
      if (outcome.claimed === 0) break;
    }
    const rows = (await outboundRepo.listForBatch(batchId)).filter(
      (row) => row.status === 'SENT',
    );
    return { opportunityId, batchId, rows };
  }

  it('correlates replies via In-Reply-To and computes positive/negative/no-response counts', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(3);
    expect(rows).toHaveLength(3);
    inbound.candidates = [
      candidate({
        mailboxUid: 'u1',
        inReplyTo: rows[0]!.messageId,
        fromEmail: rows[0]!.recipientEmail,
        subject: `Re: ${rows[0]!.subject}`,
        text: 'Sveiki, domina šis produktas. Prašome atsiųsti kainą.',
      }),
      candidate({
        mailboxUid: 'u2',
        inReplyTo: rows[1]!.messageId,
        fromEmail: rows[1]!.recipientEmail,
        subject: `Re: ${rows[1]!.subject}`,
        text: 'Not interested, please remove me from your list.',
      }),
    ];

    const summary = await results.scanBatchReplies(opportunityId, batchId, {});
    expect(summary.counts).toEqual({
      sent: 3,
      replies: 2,
      positiveReplies: 1,
      negativeReplies: 1,
      noResponse: 1,
      humanFollowUpRequired: 1,
    });
    const byOutbound = new Map(summary.rows.map((r) => [r.outboundMessageId, r]));
    const r0 = byOutbound.get(rows[0]!.id)!;
    const r1 = byOutbound.get(rows[1]!.id)!;
    const r2 = byOutbound.get(rows[2]!.id)!;
    expect(r0.outcome).toBe('PRICE_REQUEST');
    expect(r0.handoffState).toBe('HANDOFF_TO_HUMAN');
    expect(r0.humanAction).toBe('Requires human follow-up');
    expect(r0.replyStatus).toBe('REPLIED');
    expect(r1.outcome).toBe('NOT_INTERESTED');
    expect(r1.handoffState).toBe('NO_HANDOFF');
    expect(r2.replyStatus).toBe('NO_RESPONSE');
    expect(r2.outcome).toBeNull();
  });

  it('correlates a reply via the bounded fallback when headers are absent', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(2);
    inbound.candidates = [
      candidate({
        mailboxUid: 'f1',
        // No In-Reply-To / References: same sender + normalized subject.
        fromEmail: rows[1]!.recipientEmail,
        subject: `RE: ${rows[1]!.subject}`,
        receivedAt: new Date(Date.now() + 60_000),
        text: 'Interested, let us discuss.',
      }),
    ];
    const summary = await results.scanBatchReplies(opportunityId, batchId, {});
    expect(summary.counts.replies).toBe(1);
    const row = summary.rows.find((r) => r.outboundMessageId === rows[1]!.id)!;
    expect(row.replyStatus).toBe('REPLIED');
    expect(row.outcome).toBe('INTERESTED');
    expect(summary.replies[0]!.inReplyTo).toBeNull();
  });

  it('classifies price-request, wrong-contact and out-of-office replies; only positives hand off', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(3);
    inbound.candidates = [
      candidate({
        mailboxUid: 'p1',
        inReplyTo: rows[0]!.messageId,
        fromEmail: rows[0]!.recipientEmail,
        text: 'Prašome atsiųsti kainoraštį ir B2B sąlygas.',
      }),
      candidate({
        mailboxUid: 'w1',
        inReplyTo: rows[1]!.messageId,
        fromEmail: rows[1]!.recipientEmail,
        text: 'I am no longer with the company, please contact my colleague.',
      }),
      candidate({
        mailboxUid: 'o1',
        inReplyTo: rows[2]!.messageId,
        fromEmail: rows[2]!.recipientEmail,
        text: 'Automatic reply: I am out of the office until Monday.',
      }),
    ];
    const summary = await results.scanBatchReplies(opportunityId, batchId, {});
    const byOutbound = new Map(summary.rows.map((r) => [r.outboundMessageId, r]));
    expect(byOutbound.get(rows[0]!.id)!.outcome).toBe('PRICE_REQUEST');
    expect(byOutbound.get(rows[0]!.id)!.handoffState).toBe('HANDOFF_TO_HUMAN');
    expect(byOutbound.get(rows[1]!.id)!.outcome).toBe('WRONG_CONTACT');
    expect(byOutbound.get(rows[1]!.id)!.handoffState).toBe('NO_HANDOFF');
    expect(byOutbound.get(rows[1]!.id)!.humanAction).toBe('Find the correct contact');
    expect(byOutbound.get(rows[2]!.id)!.outcome).toBe('OUT_OF_OFFICE');
    expect(byOutbound.get(rows[2]!.id)!.handoffState).toBe('NO_HANDOFF');
    expect(summary.counts.positiveReplies).toBe(1);
    expect(summary.counts.humanFollowUpRequired).toBe(1);
  });

  it('allows a human to override the classification (and clears handoff)', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(2);
    inbound.candidates = [
      candidate({
        mailboxUid: 'h1',
        inReplyTo: rows[0]!.messageId,
        fromEmail: rows[0]!.recipientEmail,
        text: 'Not interested.',
      }),
    ];
    const summary = await results.scanBatchReplies(opportunityId, batchId, {});
    const reply = summary.replies[0]!;
    expect(reply.classification).toBe('NOT_INTERESTED');
    expect(reply.classificationSource).toBe('AUTO');

    const override = await api(
      'PATCH',
      `/opportunities/${opportunityId}/outreach-batches/${batchId}/results/replies/${reply.id}`,
      { classification: 'INTERESTED', note: 'Owner confirmed interest by phone.' },
    );
    expect(override.statusCode).toBe(200);
    const updated = override.json() as Json;
    expect(updated.classification).toBe('INTERESTED');
    expect(updated.classificationSource).toBe('HUMAN');
    expect(updated.handoffState).toBe('HANDOFF_TO_HUMAN');

    const after = await results.getBatchResults(opportunityId, batchId);
    expect(after.counts.positiveReplies).toBe(1);
    expect(after.counts.humanFollowUpRequired).toBe(1);
  });

  it('never sends a follow-up: a scan adds no outbound rows and leaves batch state unchanged', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(2);
    const outboundBefore = await outboundRepo.listForBatch(batchId);
    const batchBefore = await drafter.getBatchRecord(batchId);
    inbound.candidates = [
      candidate({
        mailboxUid: 'n1',
        inReplyTo: rows[0]!.messageId,
        fromEmail: rows[0]!.recipientEmail,
        text: 'Interested — please send pricing.',
      }),
    ];
    await results.scanBatchReplies(opportunityId, batchId, {});
    const outboundAfter = await outboundRepo.listForBatch(batchId);
    expect(outboundAfter).toHaveLength(outboundBefore.length);
    expect(outboundAfter.every((row) => row.status === 'SENT')).toBe(true);
    expect((await drafter.getBatchRecord(batchId))?.status).toBe(batchBefore?.status);
    // A positive reply set handoff; no message was submitted.
    const summary = await results.getBatchResults(opportunityId, batchId);
    expect(summary.counts.humanFollowUpRequired).toBe(1);
  });

  it('is idempotent: re-scanning does not duplicate replies', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(1);
    inbound.candidates = [
      candidate({
        mailboxUid: 'dup1',
        inReplyTo: rows[0]!.messageId,
        fromEmail: rows[0]!.recipientEmail,
        text: 'More information please.',
      }),
    ];
    await results.scanBatchReplies(opportunityId, batchId, {});
    const twice = await results.scanBatchReplies(opportunityId, batchId, {});
    expect(twice.counts.replies).toBe(1);
  });

  it('preserves a human override across a re-scan', async () => {
    const { opportunityId, batchId, rows } = await sendBatch(1);
    inbound.candidates = [
      candidate({
        mailboxUid: 'ov1',
        inReplyTo: rows[0]!.messageId,
        fromEmail: rows[0]!.recipientEmail,
        text: 'Not interested.',
      }),
    ];
    const first = await results.scanBatchReplies(opportunityId, batchId, {});
    const replyId = first.replies[0]!.id;
    await results.overrideClassification(opportunityId, batchId, replyId, {
      classification: 'INTERESTED',
      note: 'Owner confirmed interest by phone.',
    });

    const second = await results.scanBatchReplies(opportunityId, batchId, {});
    const updated = second.replies.find((reply) => reply.id === replyId)!;
    expect(updated.classification).toBe('INTERESTED');
    expect(updated.classificationSource).toBe('HUMAN');
    expect(updated.handoffState).toBe('HANDOFF_TO_HUMAN');
    expect(second.counts.replies).toBe(1);
    expect(second.counts.positiveReplies).toBe(1);
  });
});
