import type { PriceInquiryStatus } from '@ai-sdr/contracts';

/**
 * Market-research price state of one RFQ, derived from its lifecycle. This is a
 * *view* over the existing research objects (draft status + bounded reply
 * capture), not a second workflow model.
 */
export type MarketResearchPriceState =
  | 'PRICE_INQUIRY_PREPARED'
  | 'AWAITING_REPLY'
  | 'REPLY_RECEIVED'
  | 'QUOTE_EXTRACTED'
  | 'NO_RESPONSE';

export const NO_RESPONSE_DAYS = 14;

export function deriveMarketResearchPriceState(
  status: PriceInquiryStatus,
  sentAt: Date | null,
  now: Date = new Date(),
  noResponseDays: number = NO_RESPONSE_DAYS,
): MarketResearchPriceState {
  switch (status) {
    case 'READY_FOR_HUMAN_REVIEW':
      return 'PRICE_INQUIRY_PREPARED';
    case 'SENT':
      if (
        sentAt &&
        now.getTime() - sentAt.getTime() > noResponseDays * 86_400_000
      ) {
        return 'NO_RESPONSE';
      }
      return 'AWAITING_REPLY';
    case 'REPLY_RECEIVED':
      return 'REPLY_RECEIVED';
    case 'QUOTE_EXTRACTED':
      return 'QUOTE_EXTRACTED';
    default:
      return 'PRICE_INQUIRY_PREPARED';
  }
}
