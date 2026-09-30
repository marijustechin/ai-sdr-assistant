import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OUTREACH_TEST_RECIPIENT_ALLOWLIST,
  type OutreachTestDeliverySummary,
  type OutreachTestPreview,
  type SendOutreachTestPreviewInput,
  type SendOutreachTestPreviewResult,
} from '@ai-sdr/contracts';
import { buildRawMime } from '../../email-accounts/domain/mime.js';
import {
  InboundMailPort,
  MailTransportError,
  OutboundMailPort,
} from '../../email-accounts/domain/messaging.js';
import { OutreachDrafterService } from '../../outreach-drafter/application/outreach-drafter.service.js';
import type { OutreachDraftRecord } from '../../outreach-drafter/domain/types.js';
import type {
  OutboundRecord,
  SendStateCounts,
  TestDeliveryRecord,
} from '../domain/types.js';
import { OutreachOutboundRepository } from '../infrastructure/outreach-outbound.repository.js';
import { OutreachTestDeliveryRepository } from '../infrastructure/outreach-test-delivery.repository.js';

export const DEFAULT_PACING_SECONDS = 180;
const LEASE_MS = 120_000;
const MAX_ATTEMPTS = 3;
const MAX_TEST_DELIVERIES = 25;

function domainOf(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(at + 1) : 'localhost';
}

function safeCode(error: unknown): string {
  return error instanceof MailTransportError ? error.code : 'transport_error';
}

/** Latest draft version per lead (the batch send/list order is version desc). */
function latestPerLead(drafts: OutreachDraftRecord[]): OutreachDraftRecord[] {
  const byLead = new Map<string, OutreachDraftRecord>();
  for (const draft of drafts) {
    if (!byLead.has(draft.leadId)) byLead.set(draft.leadId, draft);
  }
  return [...byLead.values()];
}

/** Why a draft cannot receive a test copy (null when it is ready). */
function testBlockedReason(draft: OutreachDraftRecord): string | null {
  if (draft.preparationStatus !== 'PREPARED') return 'not_prepared';
  if (!draft.recipientEmail) return 'no_recipient';
  if (
    !draft.senderProfileId ||
    !draft.emailAccountId ||
    !draft.senderSnapshot?.fromEmail
  ) {
    return 'no_sender';
  }
  if (!draft.subject || !draft.body || !draft.canonicalBody) {
    return 'incomplete_content';
  }
  return null;
}

/**
 * Content-dumb send layer for approved outreach drafts. It only ever sends the
 * exact frozen snapshot persisted on an outbound row; it never regenerates,
 * rewrites, translates or personalizes content. SMTP submission and Sent-folder
 * persistence are independent (a Sent-copy failure never downgrades a send).
 * Nothing here runs automatically without an explicit human "start sending".
 */
@Injectable()
export class OutreachSenderService {
  constructor(
    @Inject(OutreachOutboundRepository)
    private readonly outbound: OutreachOutboundRepository,
    @Inject(OutreachDrafterService)
    private readonly drafter: OutreachDrafterService,
    @Inject(OutboundMailPort)
    private readonly smtp: OutboundMailPort,
    @Inject(InboundMailPort)
    private readonly imap: InboundMailPort,
    @Inject(OutreachTestDeliveryRepository)
    private readonly testDeliveries: OutreachTestDeliveryRepository,
  ) {}

  private async requireBatch(batchId: string, opportunityId: string) {
    const batch = await this.drafter.getBatchRecord(batchId);
    if (!batch || batch.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'outreach_batch_not_found' });
    }
    return batch;
  }

  /**
   * Explicit human action. Only an APPROVED batch (or a paused/queued one being
   * resumed) may start; it queues one outbound per APPROVED draft version and
   * switches the batch to SENDING. No per-email confirmation is required.
   */
  async startSending(
    opportunityId: string,
    batchId: string,
    pacingOverride?: number,
  ): Promise<SendStateCounts> {
    const { batch, drafts } = await this.drafter.getBatchForSend(batchId);
    if (batch.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'outreach_batch_not_found' });
    }
    if (batch.status === 'DRAFT' || batch.status === 'CANCELLED') {
      throw new ConflictException({ error: 'batch_not_approved' });
    }
    if (batch.status === 'SENT') {
      throw new ConflictException({ error: 'batch_already_sent' });
    }

    const pacing =
      pacingOverride ?? batch.pacingSeconds ?? DEFAULT_PACING_SECONDS;
    const now = new Date();

    if (batch.status === 'APPROVED' || batch.status === 'QUEUED') {
      // Only the latest approved version per lead is queued: re-approving a
      // reopened batch freezes new versions while the previous approved versions
      // remain as immutable history and must never be sent alongside them.
      for (const draft of latestPerLead(drafts)) {
        await this.queueDraft(draft, pacing, now);
      }
      await this.drafter.setBatchSendState(batchId, {
        status: 'SENDING',
        startedAt: batch.startedAt ?? now,
        paused: false,
        pacingSeconds: pacing,
      });
    } else if (batch.status === 'SENDING') {
      // Resume / idempotent start.
      await this.drafter.setBatchSendState(batchId, { paused: false });
    } else {
      throw new ConflictException({ error: 'batch_not_sendable' });
    }
    return this.getSendState(opportunityId, batchId);
  }

  /** Queues one immutable outbound from an approved draft version, if eligible. */
  private async queueDraft(
    draft: OutreachDraftRecord,
    pacing: number,
    now: Date,
  ): Promise<void> {
    if (
      draft.approvalStatus !== 'APPROVED' ||
      draft.preparationStatus !== 'PREPARED'
    ) {
      return;
    }
    // A human exclusion always wins: an excluded company's draft is never
    // queued, even an already-approved historical version.
    if (draft.excludedFromOutreach) return;
    const snapshot = draft.senderSnapshot;
    if (
      !draft.recipientEmail ||
      !draft.emailAccountId ||
      !draft.senderProfileId ||
      !draft.subject ||
      !draft.body ||
      !draft.canonicalBody ||
      !snapshot?.fromEmail
    ) {
      return;
    }
    if (await this.outbound.findByDraftId(draft.id)) return;

    const pacingMs = pacing * 1000;
    const latest = await this.outbound.latestScheduledForAccount(
      draft.emailAccountId,
    );
    const nextMs = Math.max(
      now.getTime(),
      latest ? latest.getTime() + pacingMs : 0,
    );
    await this.outbound.create({
      batchId: draft.batchId ?? '',
      draftId: draft.id,
      opportunityId: draft.opportunityId,
      leadId: draft.leadId,
      companyId: draft.companyId,
      emailAccountId: draft.emailAccountId,
      senderProfileId: draft.senderProfileId,
      recipientEmail: draft.recipientEmail,
      fromName: snapshot.senderName,
      fromEmail: snapshot.fromEmail,
      replyToEmail: snapshot.replyToEmail,
      subject: draft.subject,
      textBody: draft.body,
      htmlBody: draft.htmlBody,
      language: draft.language,
      messageId: `<${randomUUID()}@${domainOf(snapshot.fromEmail)}>`,
      nextEligibleAt: new Date(nextMs),
    });
  }

  async pause(
    opportunityId: string,
    batchId: string,
  ): Promise<SendStateCounts> {
    const batch = await this.requireBatch(batchId, opportunityId);
    if (batch.status !== 'SENDING' && batch.status !== 'QUEUED') {
      throw new ConflictException({ error: 'batch_not_sending' });
    }
    await this.drafter.setBatchSendState(batchId, { paused: true });
    return this.getSendState(opportunityId, batchId);
  }

  async resume(
    opportunityId: string,
    batchId: string,
  ): Promise<SendStateCounts> {
    const batch = await this.requireBatch(batchId, opportunityId);
    if (batch.status !== 'SENDING' && batch.status !== 'QUEUED') {
      throw new ConflictException({ error: 'batch_not_sending' });
    }
    await this.drafter.setBatchSendState(batchId, { paused: false });
    return this.getSendState(opportunityId, batchId);
  }

  /**
   * Cancels/archives a batch (historical records are never deleted). Queued
   * rows are cancelled; a cancelled batch is never startable or sendable.
   */
  async cancelBatch(
    opportunityId: string,
    batchId: string,
  ): Promise<SendStateCounts> {
    const batch = await this.requireBatch(batchId, opportunityId);
    if (batch.status !== 'CANCELLED') {
      await this.outbound.cancelQueued(batchId);
      await this.drafter.setBatchSendState(batchId, {
        status: 'CANCELLED',
        paused: true,
      });
    }
    return this.getSendState(opportunityId, batchId);
  }

  /**
   * Bounded worker tick: claims due outbounds, sends at most one per mailbox
   * (pacing), and tracks SMTP vs Sent-copy state independently. Safe to call
   * manually or from the env-gated in-process trigger; a restart resumes from
   * the persisted queue.
   */
  async processDue(
    limit = 10,
  ): Promise<{ claimed: number; sent: number; failed: number; skipped: number }> {
    const now = new Date();
    const claimed = await this.outbound.claimDue(now, LEASE_MS, limit);
    const usedAccounts = new Set<string>();
    const affectedBatches = new Set<string>();
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of claimed) {
      const batch = await this.drafter.getBatchRecord(row.batchId);
      if (!batch || batch.status !== 'SENDING' || batch.paused) {
        await this.outbound.release(row.id, now);
        skipped += 1;
        continue;
      }
      if (row.emailAccountId) {
        if (usedAccounts.has(row.emailAccountId)) {
          // One send per mailbox per tick (pacing).
          await this.outbound.release(row.id, now);
          skipped += 1;
          continue;
        }
        usedAccounts.add(row.emailAccountId);
      }
      const outcome = await this.sendOne(row, now);
      if (outcome === 'SENT') sent += 1;
      else failed += 1;
      affectedBatches.add(row.batchId);

      if (row.emailAccountId) {
        const pacingMs =
          (batch.pacingSeconds ?? DEFAULT_PACING_SECONDS) * 1000;
        await this.outbound.pushAccountSchedule(
          row.emailAccountId,
          new Date(now.getTime() + pacingMs),
        );
      }
    }

    for (const batchId of affectedBatches) {
      await this.refreshBatchStatus(batchId);
    }
    return { claimed: claimed.length, sent, failed, skipped };
  }

  private async sendOne(
    row: OutboundRecord,
    now: Date,
  ): Promise<'SENT' | 'FAILED'> {
    const accountId = row.emailAccountId;
    if (!accountId) {
      await this.outbound.markAttemptFailure(
        row.id,
        'email_account_missing',
        'FAILED',
        now,
      );
      return 'FAILED';
    }
    try {
      const result = await this.smtp.sendMultipart(accountId, {
        fromName: row.fromName,
        fromEmail: row.fromEmail,
        replyToEmail: row.replyToEmail,
        to: row.recipientEmail,
        subject: row.subject,
        text: row.textBody,
        html: row.htmlBody,
        messageId: row.messageId,
        date: now,
      });
      // SMTP success is durable immediately (Message-ID recorded).
      await this.outbound.markSent(row.id, now, result.providerMessageId);
      try {
        await this.imap.appendToSent(accountId, result.raw);
        await this.outbound.markSentCopy(row.id, 'APPENDED', null);
      } catch (error) {
        // SMTP succeeded: the email is SENT. Recording the copy failure must
        // never trigger a resend.
        await this.outbound.markSentCopy(row.id, 'FAILED', safeCode(error));
      }
      return 'SENT';
    } catch (error) {
      const attempts = row.attemptCount + 1;
      const code = safeCode(error);
      if (attempts >= MAX_ATTEMPTS) {
        await this.outbound.markAttemptFailure(row.id, code, 'FAILED', now);
      } else {
        const pacingMs = DEFAULT_PACING_SECONDS * 1000;
        await this.outbound.markAttemptFailure(
          row.id,
          code,
          'QUEUED',
          new Date(now.getTime() + pacingMs),
        );
      }
      return 'FAILED';
    }
  }

  /** Retries IMAP Sent append only for SENT rows whose copy failed. Never SMTP. */
  async retrySentCopy(
    opportunityId: string,
    batchId: string,
  ): Promise<{ retried: number; appended: number }> {
    await this.requireBatch(batchId, opportunityId);
    const failures = await this.outbound.listSentCopyFailures(batchId);
    let appended = 0;
    for (const row of failures) {
      if (!row.emailAccountId) continue;
      try {
        const raw = buildRawMime({
          fromName: row.fromName,
          fromEmail: row.fromEmail,
          replyToEmail: row.replyToEmail,
          to: row.recipientEmail,
          subject: row.subject,
          text: row.textBody,
          html: row.htmlBody,
          messageId: row.messageId,
          date: row.smtpSubmittedAt ?? new Date(),
        });
        await this.imap.appendToSent(row.emailAccountId, raw);
        await this.outbound.markSentCopy(row.id, 'APPENDED', null);
        appended += 1;
      } catch (error) {
        await this.outbound.markSentCopy(row.id, 'FAILED', safeCode(error));
      }
    }
    return { retried: failures.length, appended };
  }

  /**
   * Read-only test-preview surface: the selectable drafts (latest version per
   * lead), the human-supplied test-recipient allowlist, and recent test
   * deliveries. Never mutates anything.
   */
  async getTestPreview(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachTestPreview> {
    const { batch, drafts } = await this.drafter.getBatchForSend(batchId);
    if (batch.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'outreach_batch_not_found' });
    }
    const candidates = latestPerLead(drafts).map((draft) => {
      const blockedReason = testBlockedReason(draft);
      return {
        draftId: draft.id,
        leadId: draft.leadId,
        companyId: draft.companyId,
        recipientEmail: draft.recipientEmail,
        subject: draft.subject,
        approvalStatus: draft.approvalStatus,
        preparationStatus: draft.preparationStatus,
        ready: blockedReason === null,
        blockedReason,
      };
    });
    const recent = await this.testDeliveries.listForBatch(batchId);
    return {
      batchId,
      language: batch.language,
      allowlist: [...OUTREACH_TEST_RECIPIENT_ALLOWLIST],
      readyCount: candidates.filter((candidate) => candidate.ready).length,
      blockedCount: candidates.filter((candidate) => !candidate.ready).length,
      drafts: candidates,
      lastDeliveries: recent.map((row) => this.toTestSummary(row)),
    };
  }

  /**
   * Sends a **test copy** of the actual prepared content to explicitly supplied
   * allowlisted test recipients — for human visual verification before a real
   * batch is started. Only the transport recipient is overridden; nothing is
   * regenerated. This never touches production state: no draft/batch status
   * change, no production outbound row, no pacing, no outreach decision.
   */
  async sendTestPreview(
    opportunityId: string,
    batchId: string,
    input: SendOutreachTestPreviewInput,
  ): Promise<SendOutreachTestPreviewResult> {
    const { batch, drafts } = await this.drafter.getBatchForSend(batchId);
    if (batch.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'outreach_batch_not_found' });
    }
    const latest = latestPerLead(drafts);
    const byId = new Map(latest.map((draft) => [draft.id, draft]));

    let selected: OutreachDraftRecord[];
    if (input.scope === 'ALL') {
      selected = latest.filter((draft) => testBlockedReason(draft) === null);
    } else {
      selected = [];
      for (const id of input.draftIds ?? []) {
        const draft = byId.get(id);
        if (!draft) {
          throw new BadRequestException({
            error: 'test_draft_not_in_batch',
            draftId: id,
          });
        }
        const blocked = testBlockedReason(draft);
        if (blocked) {
          throw new ConflictException({
            error: 'test_draft_not_ready',
            draftId: id,
            reason: blocked,
          });
        }
        selected.push(draft);
      }
    }
    if (selected.length === 0) {
      throw new ConflictException({ error: 'no_testable_drafts' });
    }

    const allowlist = OUTREACH_TEST_RECIPIENT_ALLOWLIST as readonly string[];
    const recipients: string[] = [];
    for (const raw of input.testRecipients) {
      const email = raw.trim().toLowerCase();
      if (!email || recipients.includes(email)) continue;
      if (!allowlist.includes(email)) {
        throw new BadRequestException({
          error: 'test_recipient_not_allowed',
          recipient: raw,
        });
      }
      recipients.push(email);
    }
    if (recipients.length === 0) {
      throw new BadRequestException({ error: 'test_recipients_required' });
    }
    if (selected.length * recipients.length > MAX_TEST_DELIVERIES) {
      throw new BadRequestException({ error: 'test_preview_too_many' });
    }

    const subjectPrefix = input.subjectPrefix?.trim() ?? null;
    const delivered: OutreachTestDeliverySummary[] = [];
    for (const draft of selected) {
      for (const recipient of recipients) {
        delivered.push(
          await this.deliverTestCopy(draft, recipient, subjectPrefix),
        );
      }
    }
    const sent = delivered.filter((row) => row.status === 'SENT').length;
    const appended = delivered.filter(
      (row) => row.sentCopyStatus === 'APPENDED',
    ).length;
    const copyFailures = delivered.filter(
      (row) => row.status === 'SENT' && row.sentCopyStatus === 'FAILED',
    ).length;
    return {
      batchId,
      scope: input.scope,
      testRecipients: recipients,
      subjectPrefix,
      deliveries: delivered,
      sent,
      failed: delivered.length - sent,
      appended,
      copyFailures,
      productionUnchanged: true,
    };
  }

  /**
   * One test copy: builds the exact same raw MIME as production (identity,
   * Reply-To, subject, plain-text/HTML bodies, signature, logo) with only the
   * `To` overridden and non-visible diagnostic headers added, submits it once,
   * then appends the same bytes to Sent. A Sent-copy failure is recorded and
   * never re-submits SMTP. A failed SMTP submit is recorded as FAILED.
   */
  private async deliverTestCopy(
    draft: OutreachDraftRecord,
    testRecipient: string,
    subjectPrefix: string | null,
  ): Promise<OutreachTestDeliverySummary> {
    const snapshot = draft.senderSnapshot!;
    const accountId = draft.emailAccountId!;
    const originalRecipient = draft.recipientEmail!;
    const subject =
      subjectPrefix && subjectPrefix.length > 0
        ? `${subjectPrefix} ${draft.subject}`
        : draft.subject!;
    const messageId = `<${randomUUID()}@${domainOf(snapshot.fromEmail)}>`;
    const headers: Record<string, string> = {
      'X-AI-SDR-Test': 'true',
      'X-AI-SDR-Original-Recipient': originalRecipient,
      'X-AI-SDR-Draft-Id': draft.id,
      'X-AI-SDR-Batch-Id': draft.batchId ?? '',
    };
    const base = {
      batchId: draft.batchId ?? '',
      draftId: draft.id,
      opportunityId: draft.opportunityId,
      leadId: draft.leadId,
      emailAccountId: accountId,
      senderProfileId: draft.senderProfileId,
      originalRecipient,
      testRecipient,
      fromName: snapshot.senderName,
      fromEmail: snapshot.fromEmail,
      replyToEmail: snapshot.replyToEmail,
      subject,
      subjectPrefixed: subjectPrefix !== null && subjectPrefix.length > 0,
      language: draft.language,
      messageId,
    };
    const now = new Date();
    try {
      const result = await this.smtp.sendMultipart(accountId, {
        fromName: snapshot.senderName,
        fromEmail: snapshot.fromEmail,
        replyToEmail: snapshot.replyToEmail,
        to: testRecipient,
        subject,
        text: draft.body!,
        html: draft.htmlBody,
        messageId,
        date: now,
        headers,
      });
      const record = await this.testDeliveries.create({
        ...base,
        status: 'SENT',
        providerMessageId: result.providerMessageId,
        failureCode: null,
        smtpSubmittedAt: now,
        rawMessage: new Uint8Array(result.raw),
      });
      try {
        await this.imap.appendToSent(accountId, result.raw);
        await this.testDeliveries.markSentCopy(record.id, 'APPENDED', null);
        record.sentCopyStatus = 'APPENDED';
      } catch (error) {
        await this.testDeliveries.markSentCopy(
          record.id,
          'FAILED',
          safeCode(error),
        );
        record.sentCopyStatus = 'FAILED';
      }
      return this.toTestSummary(record);
    } catch (error) {
      const record = await this.testDeliveries.create({
        ...base,
        status: 'FAILED',
        providerMessageId: null,
        failureCode: safeCode(error),
        smtpSubmittedAt: null,
        rawMessage: null,
      });
      return this.toTestSummary(record);
    }
  }

  /** Retries the Sent append for test copies only — never re-submits SMTP. */
  async retryTestSentCopy(
    opportunityId: string,
    batchId: string,
  ): Promise<{ retried: number; appended: number }> {
    await this.requireBatch(batchId, opportunityId);
    const failures = await this.testDeliveries.listSentCopyFailures(batchId);
    let appended = 0;
    for (const row of failures) {
      if (!row.emailAccountId || !row.rawMessage) continue;
      try {
        await this.imap.appendToSent(
          row.emailAccountId,
          Buffer.from(row.rawMessage),
        );
        await this.testDeliveries.markSentCopy(row.id, 'APPENDED', null);
        appended += 1;
      } catch (error) {
        await this.testDeliveries.markSentCopy(
          row.id,
          'FAILED',
          safeCode(error),
        );
      }
    }
    return { retried: failures.length, appended };
  }

  private toTestSummary(row: TestDeliveryRecord): OutreachTestDeliverySummary {
    return {
      id: row.id,
      draftId: row.draftId,
      batchId: row.batchId,
      testRecipient: row.testRecipient,
      originalRecipient: row.originalRecipient,
      subject: row.subject,
      subjectPrefixed: row.subjectPrefixed,
      status: row.status,
      sentCopyStatus: row.sentCopyStatus,
      failureCode: row.failureCode,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Read-only: the SENT outbound rows of a batch. Used by `outreach-results` to
   * correlate inbound replies; the sender remains the single writer of this table.
   */
  async listSentOutbound(batchId: string): Promise<OutboundRecord[]> {
    const rows = await this.outbound.listForBatch(batchId);
    return rows.filter((row) => row.status === 'SENT');
  }

  async getSendState(
    opportunityId: string,
    batchId: string,
  ): Promise<SendStateCounts> {
    const batch = await this.requireBatch(batchId, opportunityId);
    const { drafts } = await this.drafter.getBatchForSend(batchId);
    const approved = latestPerLead(drafts).filter(
      (draft) =>
        draft.approvalStatus === 'APPROVED' &&
        draft.preparationStatus === 'PREPARED' &&
        !draft.excludedFromOutreach,
    ).length;
    const counts = await this.outbound.countByBatch(batchId);
    const queuedTotal =
      counts.queued +
      counts.sending +
      counts.sent +
      counts.failed +
      counts.cancelled;
    return {
      approved,
      queued: counts.queued,
      sending: counts.sending,
      sent: counts.sent,
      failed: counts.failed,
      cancelled: counts.cancelled,
      pending: Math.max(0, approved - queuedTotal),
      sentCopyFailures: counts.sentCopyFailures,
      pacingSeconds: batch.pacingSeconds ?? DEFAULT_PACING_SECONDS,
      nextScheduledAt: counts.nextScheduledAt?.toISOString() ?? null,
    };
  }

  /** Derives the batch status from its outbound delivery states. */
  private async refreshBatchStatus(batchId: string): Promise<void> {
    const counts = await this.outbound.countByBatch(batchId);
    const active = counts.queued + counts.sending;
    if (active > 0) {
      await this.drafter.setBatchSendState(batchId, { status: 'SENDING' });
      return;
    }
    const total =
      counts.sent + counts.failed + counts.cancelled + active;
    if (total === 0) return;
    if (counts.sent > 0) {
      await this.drafter.setBatchSendState(batchId, { status: 'SENT' });
    } else if (counts.failed > 0) {
      await this.drafter.setBatchSendState(batchId, { status: 'FAILED' });
    }
  }
}
