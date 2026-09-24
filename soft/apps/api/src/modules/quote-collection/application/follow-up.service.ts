import { Inject, Injectable } from '@nestjs/common';
import type { RunDueFollowUpsResponse } from '@ai-sdr/contracts';
import { PriceInquiryService } from '../../price-inquiry/application/price-inquiry.service.js';
import {
  isExpired,
  nextCheckAt,
  resolveFollowUpPolicy,
} from '../domain/follow-up-policy.js';
import { QuoteFollowUpRepository } from '../infrastructure/quote-follow-up.repository.js';
import { QuoteCollectionService } from './quote-collection.service.js';

const DEFAULT_BATCH_SIZE = 10;

/**
 * Processes due reply-check schedules. It only ever *checks for replies* to an
 * already human-approved/sent inquiry (reusing the account-wide quote-collection
 * scan) and never sends mail. Due rows sharing one mailbox are coordinated: the
 * mailbox is scanned once per batch, and the account-wide scan routes every
 * reply to its own RFQ, so one inquiry can never consume another's reply.
 * Duplicate processing is prevented by the repository's compare-and-swap claim.
 */
@Injectable()
export class FollowUpService {
  constructor(
    @Inject(QuoteFollowUpRepository)
    private readonly followUps: QuoteFollowUpRepository,
    @Inject(QuoteCollectionService)
    private readonly quoteCollection: QuoteCollectionService,
    @Inject(PriceInquiryService)
    private readonly priceInquiry: PriceInquiryService,
  ) {}

  async processDue(limit = DEFAULT_BATCH_SIZE): Promise<RunDueFollowUpsResponse> {
    const policy = resolveFollowUpPolicy();
    const now = new Date();
    const batch = Math.min(Math.max(limit, 1), 50);
    const due = await this.followUps.listDue(now, batch);
    const summary: RunDueFollowUpsResponse = {
      claimed: 0,
      matched: 0,
      noReply: 0,
      expired: 0,
      errors: 0,
    };

    // One bounded scan per mailbox in this batch (replies may belong to any sent
    // RFQ on that account, not only the due rows).
    const scannedAccounts = new Set<string>();
    for (const row of due) {
      const accountId = row.emailAccountId;
      if (!accountId || scannedAccounts.has(accountId)) continue;
      scannedAccounts.add(accountId);
      try {
        await this.quoteCollection.scanAccountReplies(accountId);
      } catch {
        // Scanning failure is retried per row (leased and rescheduled below).
      }
    }

    for (const row of due) {
      const leaseUntil = new Date(now.getTime() + policy.leaseMinutes * 60_000);
      const claimed = await this.followUps.claim(row.id, now, leaseUntil);
      if (!claimed) continue; // already answered by the scan or claimed elsewhere
      summary.claimed += 1;

      try {
        const draft = await this.priceInquiry.getDraftById(
          row.priceInquiryDraftId,
        );
        if (
          draft.status === 'QUOTE_EXTRACTED' ||
          draft.status === 'REPLY_RECEIVED'
        ) {
          // The supplier replied (with or without a usable price).
          await this.followUps.markCompleted(row.id, 'MATCHED', now);
          summary.matched += 1;
          continue;
        }
        if (draft.status === 'NO_RESPONSE') {
          await this.followUps.expire(row.id, 'NO_RESPONSE', now);
          summary.expired += 1;
          continue;
        }

        const sentAt =
          (await this.quoteCollection.getLatestOutboundSentAt(
            row.priceInquiryDraftId,
          )) ?? row.createdAt;
        const next =
          isExpired(sentAt, now, policy)
            ? null
            : nextCheckAt(sentAt, row.attemptCount, policy);

        if (!next) {
          await this.quoteCollection.markInquiryNoResponse(
            row.priceInquiryDraftId,
          );
          await this.followUps.expire(row.id, 'NO_RESPONSE', now);
          summary.expired += 1;
        } else {
          await this.followUps.reschedule(row.id, next, 'NO_REPLY');
          summary.noReply += 1;
        }
      } catch {
        await this.followUps.reschedule(
          row.id,
          new Date(now.getTime() + policy.leaseMinutes * 60_000),
          'ERROR',
        );
        summary.errors += 1;
      }
    }
    return summary;
  }
}
