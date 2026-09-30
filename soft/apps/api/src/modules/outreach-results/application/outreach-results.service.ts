import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isNegativeOutreachReply,
  isPositiveOutreachReply,
  type ClassifyOutreachReplyInput,
  type ScanOutreachRepliesInput,
} from '@ai-sdr/contracts';
import { LeadDiscovererService } from '../../lead-discoverer/application/lead-discoverer.service.js';
import { InboundMailPort } from '../../email-accounts/domain/messaging.js';
import { OutreachDrafterService } from '../../outreach-drafter/application/outreach-drafter.service.js';
import { OutreachSenderService } from '../../outreach-sender/application/outreach-sender.service.js';
import { classifyReply } from '../domain/classification.js';
import { matchReply, type InboundRef } from '../domain/reply-matching.js';
import type {
  OutboundRef,
  OutreachBatchResults,
  OutreachReplyClassification,
  OutreachReplyRecord,
  OutreachResultRow,
} from '../domain/types.js';
import { OutreachReplyRepository } from '../infrastructure/outreach-reply.repository.js';

const DEFAULT_WINDOW_DAYS = 14;
const DEFAULT_LIMIT = 50;

/** Human action derived from a classification (never an inferred intent). */
export function humanActionFor(
  classification: OutreachReplyClassification | null,
): string {
  switch (classification) {
    case 'INTERESTED':
    case 'PRICE_REQUEST':
    case 'MORE_INFO':
      return 'Requires human follow-up';
    case 'NOT_INTERESTED':
      return 'No action (closed)';
    case 'WRONG_CONTACT':
      return 'Find the correct contact';
    case 'OUT_OF_OFFICE':
      return 'Re-contact after their return';
    case 'OTHER':
      return 'Review manually';
    default:
      return 'No reply yet';
  }
}

/**
 * Application service for `outreach-results`. It ingests inbound replies to sent
 * outreach, correlates them to the batch/draft/lead, and classifies them into a
 * small bounded set. Positive commercial replies set a HANDOFF_TO_HUMAN state;
 * the assistant never sends a follow-up. Classification is reviewable and may be
 * overridden by a human.
 */
@Injectable()
export class OutreachResultsService {
  constructor(
    @Inject(OutreachReplyRepository)
    private readonly replies: OutreachReplyRepository,
    @Inject(OutreachDrafterService)
    private readonly drafter: OutreachDrafterService,
    @Inject(OutreachSenderService)
    private readonly sender: OutreachSenderService,
    @Inject(LeadDiscovererService)
    private readonly leads: LeadDiscovererService,
    @Inject(InboundMailPort)
    private readonly inbound: InboundMailPort,
  ) {}

  private async requireBatch(opportunityId: string, batchId: string) {
    const batch = await this.drafter.getBatchRecord(batchId);
    if (!batch || batch.opportunityId !== opportunityId) {
      throw new NotFoundException({ error: 'outreach_batch_not_found' });
    }
    return batch;
  }

  private toOutboundRef(row: {
    id: string;
    messageId: string;
    recipientEmail: string;
    subject: string;
    smtpSubmittedAt: Date | null;
    queuedAt: Date;
    leadId: string;
    companyId: string;
    draftId: string;
    emailAccountId: string | null;
    opportunityId: string;
  }): OutboundRef {
    return {
      id: row.id,
      messageId: row.messageId,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      sentAt: row.smtpSubmittedAt ?? row.queuedAt,
      leadId: row.leadId,
      companyId: row.companyId,
      draftId: row.draftId,
      emailAccountId: row.emailAccountId ?? '',
      opportunityId: row.opportunityId,
    };
  }

  /**
   * Bounded inbox scan: fetches recent inbound messages for each mailbox used by
   * the batch and persists only those correlated to one of the batch's sent
   * messages. Idempotent per mailbox message. Never sends anything.
   */
  async scanBatchReplies(
    opportunityId: string,
    batchId: string,
    input: ScanOutreachRepliesInput,
  ): Promise<OutreachBatchResults> {
    await this.requireBatch(opportunityId, batchId);
    const sent = await this.sender.listSentOutbound(batchId);
    const refs = sent.map((row) => this.toOutboundRef(row));
    const accountIds = [
      ...new Set(refs.map((ref) => ref.emailAccountId).filter((id) => id)),
    ];
    const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;
    const limit = input.limit ?? DEFAULT_LIMIT;

    for (const accountId of accountIds) {
      const candidates = await this.inbound.scanRecent(accountId, {
        sinceDays: windowDays,
        limit,
      });
      for (const candidate of candidates) {
        const existing = await this.replies.findByMailboxUid(
          accountId,
          candidate.mailboxUid,
        );
        if (existing) {
          // Refresh an AUTO classification with the current bounded rules;
          // a HUMAN override is never overwritten.
          if (existing.classificationSource === 'AUTO') {
            const refreshed = classifyReply(candidate.subject, candidate.text);
            if (refreshed.classification !== existing.classification) {
              await this.replies.updateClassification(existing.id, {
                classification: refreshed.classification,
                classificationSource: 'AUTO',
                classificationReason: refreshed.reason,
                handoffState: isPositiveOutreachReply(refreshed.classification)
                  ? 'HANDOFF_TO_HUMAN'
                  : 'NO_HANDOFF',
                notes: existing.notes,
              });
            }
          }
          continue;
        }
        const inbound: InboundRef = {
          providerMessageId: candidate.providerMessageId,
          inReplyTo: candidate.inReplyTo,
          references: candidate.references,
          fromEmail: candidate.fromEmail,
          subject: candidate.subject,
          receivedAt: candidate.receivedAt,
        };
        const match = matchReply(inbound, refs);
        if (match.kind !== 'header' && match.kind !== 'fallback') continue;
        const outbound = refs.find((ref) => ref.id === match.outboundId);
        if (!outbound) continue;

        const classified = classifyReply(candidate.subject, candidate.text);
        await this.replies.create({
          batchId,
          outboundMessageId: outbound.id,
          opportunityId,
          leadId: outbound.leadId,
          companyId: outbound.companyId,
          draftId: outbound.draftId,
          emailAccountId: accountId,
          mailboxUid: candidate.mailboxUid,
          providerMessageId: candidate.providerMessageId,
          inReplyTo: candidate.inReplyTo,
          references: candidate.references,
          fromEmail: candidate.fromEmail,
          toEmail: candidate.toEmail,
          subject: candidate.subject,
          bodyText: candidate.text,
          receivedAt: candidate.receivedAt,
          classification: classified.classification,
          classificationSource: 'AUTO',
          classificationReason: classified.reason,
          handoffState: isPositiveOutreachReply(classified.classification)
            ? 'HANDOFF_TO_HUMAN'
            : 'NO_HANDOFF',
          excerpt: classified.excerpt,
        });
      }
    }
    return this.getBatchResults(opportunityId, batchId);
  }

  async getBatchResults(
    opportunityId: string,
    batchId: string,
  ): Promise<OutreachBatchResults> {
    await this.requireBatch(opportunityId, batchId);
    const sent = await this.sender.listSentOutbound(batchId);
    const replies = await this.replies.listForBatch(batchId);
    const byOutbound = new Map<string, OutreachReplyRecord>();
    for (const reply of replies) {
      if (reply.outboundMessageId && !byOutbound.has(reply.outboundMessageId)) {
        byOutbound.set(reply.outboundMessageId, reply);
      }
    }

    const rows: OutreachResultRow[] = [];
    for (const outbound of sent) {
      const reply = byOutbound.get(outbound.id) ?? null;
      const companyName = await this.companyName(outbound.companyId);
      rows.push({
        outboundMessageId: outbound.id,
        companyId: outbound.companyId,
        companyName,
        recipientEmail: outbound.recipientEmail,
        sentAt: (outbound.smtpSubmittedAt ?? outbound.queuedAt).toISOString(),
        replyStatus: reply ? 'REPLIED' : 'NO_RESPONSE',
        outcome: reply?.classification ?? null,
        handoffState: reply?.handoffState ?? 'NONE',
        humanAction: humanActionFor(reply?.classification ?? null),
        notes: reply?.notes ?? null,
        excerpt: reply?.excerpt ?? null,
        replyId: reply?.id ?? null,
        classificationSource: reply?.classificationSource ?? null,
      });
    }

    const positiveReplies = replies.filter((reply) =>
      isPositiveOutreachReply(reply.classification),
    ).length;
    const negativeReplies = replies.filter((reply) =>
      isNegativeOutreachReply(reply.classification),
    ).length;
    const repliedOutbound = new Set(
      replies
        .map((reply) => reply.outboundMessageId)
        .filter((value): value is string => value !== null),
    );
    return {
      batchId,
      opportunityId,
      counts: {
        sent: sent.length,
        replies: replies.length,
        positiveReplies,
        negativeReplies,
        noResponse: Math.max(0, sent.length - repliedOutbound.size),
        humanFollowUpRequired: replies.filter(
          (reply) => reply.handoffState === 'HANDOFF_TO_HUMAN',
        ).length,
      },
      rows,
      replies,
    };
  }

  /** Human override of a reply classification (reviewable; recomputes handoff). */
  async overrideClassification(
    opportunityId: string,
    batchId: string,
    replyId: string,
    input: ClassifyOutreachReplyInput,
  ): Promise<OutreachReplyRecord> {
    await this.requireBatch(opportunityId, batchId);
    const reply = await this.replies.findById(replyId);
    if (!reply || reply.batchId !== batchId) {
      throw new NotFoundException({ error: 'outreach_reply_not_found' });
    }
    return this.replies.updateClassification(reply.id, {
      classification: input.classification,
      classificationSource: 'HUMAN',
      classificationReason: input.note ?? reply.classificationReason,
      handoffState: isPositiveOutreachReply(input.classification)
        ? 'HANDOFF_TO_HUMAN'
        : 'NO_HANDOFF',
      notes: input.note ?? reply.notes,
    });
  }

  private async companyName(companyId: string): Promise<string> {
    try {
      const company = await this.leads.getCompany(companyId);
      return company.name;
    } catch {
      return '(unknown company)';
    }
  }
}
