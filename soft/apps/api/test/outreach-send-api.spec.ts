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
import { OutreachOutboundRepository } from '../src/modules/outreach-sender/infrastructure/outreach-outbound.repository.js';
import { OutreachTestDeliveryRepository } from '../src/modules/outreach-sender/infrastructure/outreach-test-delivery.repository.js';
import { OutreachSenderService } from '../src/modules/outreach-sender/application/outreach-sender.service.js';
import { buildRawMime } from '../src/modules/email-accounts/domain/mime.js';
import {
  InboundMailPort,
  MailTransportError,
  OutboundMailPort,
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
  calls: Array<{ accountId: string; spec: OutboundMultipartSpec; raw: Buffer }> =
    [];
  fail = false;
  async send(): Promise<OutboundMailResult> {
    throw new Error('send() not used by the sender');
  }
  async sendMultipart(
    accountId: string,
    spec: OutboundMultipartSpec,
  ): Promise<OutboundMultipartResult> {
    if (this.fail) throw new MailTransportError('smtp_failed');
    const raw = buildRawMime(spec);
    this.calls.push({ accountId, spec, raw });
    return {
      messageId: spec.messageId,
      providerMessageId: `prov${spec.messageId}`,
      raw,
    };
  }
}

class FakeImap extends InboundMailPort {
  appends: Array<{ accountId: string; raw: Buffer }> = [];
  fail = false;
  async scanRecent(): Promise<[]> {
    return [];
  }
  async appendToSent(accountId: string, raw: Buffer): Promise<void> {
    if (this.fail) throw new MailTransportError('sent_append_failed');
    this.appends.push({ accountId, raw });
  }
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

describe('Outreach batch sending (integration, fake transport)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let drafter: OutreachDrafterService;
  let repo: OutreachOutboundRepository;
  let testDeliveries: OutreachTestDeliveryRepository;
  let smtp: FakeSmtp;
  let imap: FakeImap;
  let service: OutreachSenderService;

  beforeAll(async () => {
    app = await createApp();
    prisma = app.get(PrismaService);
    drafter = app.get(OutreachDrafterService);
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDatabase(prisma.db);
    smtp = new FakeSmtp();
    imap = new FakeImap();
    repo = new OutreachOutboundRepository(prisma);
    testDeliveries = new OutreachTestDeliveryRepository(prisma);
    // A fresh service instance each test also simulates a worker restart.
    service = new OutreachSenderService(repo, drafter, smtp, imap, testDeliveries);
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

  async function addDraftableLead(
    opportunityId: string,
    runId: string,
    evidenceId: string,
    companyName: string,
  ): Promise<Json> {
    const lead = (
      await api('POST', `/opportunities/${opportunityId}/leads`, {
        companyName,
        country: 'Lithuania',
        observedActivityText: 'sells sauna cladding',
        observedRoles: ['DISTRIBUTOR'],
        buyerFitHypothesisText: 'May resell the product.',
        researchRunId: runId,
        evidenceId,
      })
    ).json() as Json;
    await api('PATCH', `/opportunities/${opportunityId}/leads/${lead.id as string}/qualification`, {
      status: 'QUALIFIED',
      reason: 'Product-fit: distributor.',
    });
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

  async function approvedBatch(pacingSeconds = 3600): Promise<{
    opportunityId: string;
    batchId: string;
    draftIds: string[];
  }> {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    await addDraftableLead(opportunityId, runId, evidenceId, 'Consolva');
    await addDraftableLead(opportunityId, runId, evidenceId, 'Geras Garas');
    await assignSender(productId);
    const summary = (
      await api('POST', `/opportunities/${opportunityId}/outreach-batches`, {
        language: 'en',
        pacingSeconds,
      })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;
    const approved = (
      await api('POST', `/opportunities/${opportunityId}/outreach-batches/${batchId}/approve`)
    ).json() as Json;
    const draftIds = (approved.drafts as Json[]).map((d) => d.id as string);
    return { opportunityId, batchId, draftIds };
  }

  async function forceDue(draftId: string) {
    await prisma.db.outreachOutboundMessage.updateMany({
      where: { draftId },
      data: { nextEligibleAt: new Date(Date.now() - 1000) },
    });
  }

  /** First occurrence per lead is the latest version (rows are version desc). */
  function latestPerLead(list: Json[]): Json[] {
    const byLead = new Map<string, Json>();
    for (const draft of list) {
      if (!byLead.has(draft.leadId as string)) {
        byLead.set(draft.leadId as string, draft);
      }
    }
    return [...byLead.values()];
  }

  async function expectHttpError(
    promise: Promise<unknown>,
    code: string,
  ): Promise<void> {
    let error: unknown;
    try {
      await promise;
    } catch (caught) {
      error = caught;
    }
    const response = (error as { getResponse?: () => unknown } | undefined)
      ?.getResponse?.();
    expect(response).toMatchObject({ error: code });
  }

  it('only an APPROVED batch may start sending', async () => {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    await addDraftableLead(opportunityId, runId, evidenceId, 'Consolva');
    await assignSender(productId);
    const summary = (
      await api('POST', `/opportunities/${opportunityId}/outreach-batches`, { language: 'en' })
    ).json() as Json;
    const batchId = (summary.batch as Json).id as string;

    // Still DRAFT (not approved).
    await expectHttpError(
      service.startSending(opportunityId, batchId),
      'batch_not_approved',
    );
  });

  it('sends the first due message, delays the next by the interval, records the Message-ID, and completes the batch when all are sent', async () => {
    const { opportunityId, batchId, draftIds } = await approvedBatch(3600);
    await service.startSending(opportunityId, batchId);

    const queued = await repo.listForBatch(batchId);
    expect(queued).toHaveLength(2);
    // First is due now; the second is paced ~3600s later.
    const times = queued.map((row) => row.nextEligibleAt.getTime()).sort((a, b) => a - b);
    expect(times[1]! - times[0]!).toBeGreaterThanOrEqual(3_600_000 - 5_000);

    const first = await service.processDue(10);
    expect(first.sent).toBe(1);
    expect(smtp.calls).toHaveLength(1);
    const sentRow = (await repo.listForBatch(batchId)).find((row) => row.status === 'SENT');
    expect(sentRow?.providerMessageId).toContain('prov<');
    expect(sentRow?.messageId.startsWith('<')).toBe(true);
    // The same serialized bytes were appended to Sent.
    expect(imap.appends).toHaveLength(1);
    expect(imap.appends[0]!.raw.equals(smtp.calls[0]!.raw)).toBe(true);

    // Batch is not SENT yet (one queued).
    expect((await drafter.getBatchRecord(batchId))?.status).toBe('SENDING');

    // Make the second due and send it.
    await forceDue(draftIds[1]!);
    const second = await service.processDue(10);
    expect(second.sent).toBe(1);
    expect((await drafter.getBatchRecord(batchId))?.status).toBe('SENT');
  });

  it('never re-submits an already-sent draft (retry/restart safe)', async () => {
    const { opportunityId, batchId, draftIds } = await approvedBatch(0);
    await service.startSending(opportunityId, batchId);
    await service.processDue(10); // first of the two (one per mailbox per tick)
    const afterFirst = smtp.calls.length;
    expect(afterFirst).toBe(1);

    // A fresh service instance (restart) plus repeated ticks cannot duplicate.
    const restarted = new OutreachSenderService(repo, drafter, smtp, imap, testDeliveries);
    await restarted.processDue(10);
    await restarted.processDue(10);
    const sentCount = (await repo.listForBatch(batchId)).filter(
      (row) => row.status === 'SENT',
    ).length;
    expect(smtp.calls.length).toBe(sentCount);
    expect(draftIds).toHaveLength(2);
  });

  it('keeps SMTP success even when the Sent append fails, and retrying the copy never calls SMTP', async () => {
    const { opportunityId, batchId } = await approvedBatch(0);
    await service.startSending(opportunityId, batchId);
    imap.fail = true;
    await service.processDue(10);

    const row = (await repo.listForBatch(batchId)).find((r) => r.status === 'SENT');
    expect(row).toBeTruthy();
    expect(row?.sentCopyStatus).toBe('FAILED');
    const smtpCalls = smtp.calls.length;

    // Retry the Sent copy only — SMTP is never called again.
    imap.fail = false;
    const result = await service.retrySentCopy(opportunityId, batchId);
    expect(result.appended).toBe(1);
    expect(smtp.calls.length).toBe(smtpCalls);
    const repaired = (await repo.listForBatch(batchId)).find((r) => r.status === 'SENT');
    expect(repaired?.sentCopyStatus).toBe('APPENDED');
  });

  it('pause prevents new sends and resume continues from the persisted queue', async () => {
    const { opportunityId, batchId, draftIds } = await approvedBatch(0);
    await service.startSending(opportunityId, batchId);
    await service.pause(opportunityId, batchId);

    const before = smtp.calls.length;
    await forceDue(draftIds[0]!);
    await forceDue(draftIds[1]!);
    const paused = await service.processDue(10);
    expect(paused.sent).toBe(0);
    expect(smtp.calls.length).toBe(before);

    await service.resume(opportunityId, batchId);
    const resumed = await service.processDue(10);
    expect(resumed.sent).toBeGreaterThan(0);
  });

  it('does not queue a draft that is still PENDING after a post-approval edit', async () => {
    const { opportunityId, batchId, draftIds } = await approvedBatch(0);
    // Edit one draft after approval -> new PENDING version; batch returns to DRAFT.
    const { drafts } = await drafter.getBatchForSend(batchId);
    const target = drafts.find((d) => d.approvalStatus === 'APPROVED')!;
    await api(
      'PATCH',
      `/opportunities/${opportunityId}/leads/${target.leadId}/outreach-drafts/${target.id}`,
      { canonicalBody: 'Human edit.\n\nWould this be relevant?' },
    );
    expect((await drafter.getBatchRecord(batchId))?.status).toBe('DRAFT');

    // Starting is blocked until re-approved; the pending edit is not queued.
    await expectHttpError(
      service.startSending(opportunityId, batchId),
      'batch_not_approved',
    );
    expect(draftIds).toHaveLength(2);
  });

  async function draftBatch(): Promise<{
    opportunityId: string;
    batchId: string;
    drafts: Json[];
  }> {
    const { opportunityId, runId, productId, evidenceId } = await seedScope();
    await addDraftableLead(opportunityId, runId, evidenceId, 'Consolva');
    await addDraftableLead(opportunityId, runId, evidenceId, 'Geras Garas');
    await assignSender(productId);
    const summary = (
      await api('POST', `/opportunities/${opportunityId}/outreach-batches`, {
        language: 'en',
      })
    ).json() as Json;
    return {
      opportunityId,
      batchId: (summary.batch as Json).id as string,
      drafts: summary.drafts as Json[],
    };
  }

  it('test preview lists latest drafts per lead and does not mutate production state', async () => {
    const { opportunityId, batchId } = await draftBatch();

    const preview = await service.getTestPreview(opportunityId, batchId);
    expect(preview.allowlist).toEqual([
      'm.smiginas@gmail.com',
      'info@alfasis.eu',
    ]);
    // Latest version per lead only (2 leads), all ready (nothing approved needed).
    expect(preview.drafts).toHaveLength(2);
    expect(preview.readyCount).toBe(2);
    expect(preview.drafts.every((d) => d.ready)).toBe(true);
    expect(preview.lastDeliveries).toHaveLength(0);

    // Read-only: no production rows, batch still DRAFT.
    expect(await prisma.db.outreachOutboundMessage.count()).toBe(0);
    expect(await prisma.db.outreachTestDelivery.count()).toBe(0);
    expect((await drafter.getBatchRecord(batchId))?.status).toBe('DRAFT');
  });

  it('sends test copies to allowlisted recipients only, preserving the real content and leaving production untouched', async () => {
    const { opportunityId, batchId, drafts } = await draftBatch();
    const realRecipient = drafts[0]!.recipientEmail as string;
    const draftCountBefore = await prisma.db.outreachDraft.count();

    const result = await service.sendTestPreview(opportunityId, batchId, {
      scope: 'ALL',
      testRecipients: ['m.smiginas@gmail.com'],
    });

    // Two test copies (2 drafts x 1 test recipient), none to the real recipient.
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.productionUnchanged).toBe(true);
    expect(smtp.calls).toHaveLength(2);
    for (const call of smtp.calls) {
      expect(call.spec.to).toBe('m.smiginas@gmail.com');
      expect(call.spec.to).not.toBe(realRecipient);
      // Same content as production: subject and both bodies are the draft's.
      expect(call.spec.text.length).toBeGreaterThan(0);
      // Non-visible diagnostic headers; subject is not prefixed by default.
      expect(call.spec.headers?.['X-AI-SDR-Test']).toBe('true');
      expect(call.spec.headers?.['X-AI-SDR-Original-Recipient']).toBe(
        realRecipient,
      );
      expect(call.spec.headers?.['X-AI-SDR-Draft-Id']).toBeTruthy();
      expect(call.spec.subject.startsWith('[TEST]')).toBe(false);
      const raw = call.raw.toString('utf8');
      expect(raw).toContain('X-AI-SDR-Test: true');
      expect(raw).toContain(`X-AI-SDR-Original-Recipient: ${realRecipient}`);
    }
    // Same serialized bytes appended to the sender mailbox Sent folder.
    expect(imap.appends).toHaveLength(2);
    expect(imap.appends[0]!.raw.equals(smtp.calls[0]!.raw)).toBe(true);

    // Tracked separately; production state is untouched.
    expect(await prisma.db.outreachOutboundMessage.count()).toBe(0);
    expect(await prisma.db.outreachTestDelivery.count()).toBe(2);
    expect(result.deliveries.every((d) => d.sentCopyStatus === 'APPENDED')).toBe(
      true,
    );
    expect((await drafter.getBatchRecord(batchId))?.status).toBe('DRAFT');
    expect(await prisma.db.outreachDraft.count()).toBe(draftCountBefore);
    const persisted = await drafter.getBatchForSend(batchId);
    expect(
      persisted.drafts.every((d) => d.approvalStatus === 'PENDING'),
    ).toBe(true);
  });

  it('applies an optional subject prefix but preserves the real subject by default', async () => {
    const { opportunityId, batchId, drafts } = await draftBatch();
    const realSubject = drafts[0]!.subject as string;

    const prefixed = await service.sendTestPreview(opportunityId, batchId, {
      scope: 'SELECTED',
      draftIds: [drafts[0]!.id as string],
      testRecipients: ['info@alfasis.eu'],
      subjectPrefix: '[TEST]',
    });
    expect(prefixed.deliveries).toHaveLength(1);
    expect(smtp.calls[0]!.spec.subject).toBe(`[TEST] ${realSubject}`);
    expect(prefixed.deliveries[0]!.subjectPrefixed).toBe(true);
  });

  it('rejects test recipients that are not on the allowlist', async () => {
    const { opportunityId, batchId, drafts } = await draftBatch();
    await expectHttpError(
      service.sendTestPreview(opportunityId, batchId, {
        scope: 'SELECTED',
        draftIds: [drafts[0]!.id as string],
        testRecipients: ['attacker@example.invalid'],
      }),
      'test_recipient_not_allowed',
    );
    expect(smtp.calls).toHaveLength(0);
    expect(await prisma.db.outreachTestDelivery.count()).toBe(0);
  });

  it('keeps a test SMTP success when the Sent append fails and copy retry never re-SMTPs', async () => {
    const { opportunityId, batchId, drafts } = await draftBatch();
    imap.fail = true;
    const result = await service.sendTestPreview(opportunityId, batchId, {
      scope: 'SELECTED',
      draftIds: [drafts[0]!.id as string],
      testRecipients: ['m.smiginas@gmail.com'],
    });
    expect(result.sent).toBe(1);
    expect(result.copyFailures).toBe(1);
    const smtpCalls = smtp.calls.length;

    imap.fail = false;
    const retried = await service.retryTestSentCopy(opportunityId, batchId);
    expect(retried.appended).toBe(1);
    expect(smtp.calls.length).toBe(smtpCalls);
    const row = await prisma.db.outreachTestDelivery.findFirstOrThrow({});
    expect(row.sentCopyStatus).toBe('APPENDED');
  });

  it('test preview uses the latest current (pending) version, not a superseded approved version', async () => {
    const { opportunityId, batchId } = await draftBatch();
    await api(
      'POST',
      `/opportunities/${opportunityId}/outreach-batches/${batchId}/approve`,
    );
    await api(
      'POST',
      `/opportunities/${opportunityId}/outreach-batches/${batchId}/reopen`,
      {},
    );
    const applied = (
      await api(
        'POST',
        `/opportunities/${opportunityId}/outreach-batches/${batchId}/apply-message`,
        { subject: 'Current pending subject' },
      )
    ).json() as Json;
    const current = latestPerLead(applied.drafts as Json[]);
    expect(current.every((d) => d.approvalStatus === 'PENDING')).toBe(true);

    const preview = await service.getTestPreview(opportunityId, batchId);
    expect(preview.drafts.every((d) => d.approvalStatus === 'PENDING')).toBe(true);

    const target = current[0]!;
    const result = await service.sendTestPreview(opportunityId, batchId, {
      scope: 'SELECTED',
      draftIds: [target.id as string],
      testRecipients: ['m.smiginas@gmail.com'],
    });
    expect(result.sent).toBe(1);
    expect(smtp.calls[0]!.spec.subject).toBe('Current pending subject');
    expect(smtp.calls[0]!.spec.headers?.['X-AI-SDR-Draft-Id']).toBe(
      target.id as string,
    );
  });

  it('never queues an already-approved draft whose company is excluded by a human outreach decision', async () => {
    const { opportunityId, batchId, draftIds } = await approvedBatch(0);
    const { drafts } = await drafter.getBatchForSend(batchId);
    const target = latestPerLead(drafts as unknown as Json[])[0]!;
    const decision = await api(
      'PUT',
      `/opportunities/${opportunityId}/companies/${target.companyId}/outreach-decision`,
      { decision: 'DO_NOT_CONTACT' },
    );
    expect(decision.statusCode).toBe(200);

    await service.startSending(opportunityId, batchId);
    const queued = await repo.listForBatch(batchId);
    expect(queued).toHaveLength(1);
    expect(queued.every((row) => row.companyId !== target.companyId)).toBe(true);
    expect(draftIds).toHaveLength(2);
  });
});
