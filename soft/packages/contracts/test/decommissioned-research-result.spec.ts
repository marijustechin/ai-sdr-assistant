import { describe, expect, it } from 'vitest';
import * as contracts from '../src/index.js';

/**
 * Supplier price inquiry was decommissioned as a Market Research capability
 * (2026-09-25). The research-result contracts existed only to track supplier
 * price clarifications and must no longer be exported. The retained mailbox
 * infrastructure schemas stay available for future sales-outreach reuse.
 */
describe('decommissioned research-result contracts', () => {
  it('no longer exports the supplier-clarification result shapes', () => {
    for (const name of [
      'ResearchResultSchema',
      'ResearchResultCountsSchema',
      'ResearchResultInquirySchema',
      'ResearchClarificationStateSchema',
      'FinalizeResearchResultSchema',
    ]) {
      expect(name in contracts).toBe(false);
    }
  });

  it('keeps the retained run-status, follow-up and generic mailbox schemas', () => {
    expect('ResearchRunStatusSchema' in contracts).toBe(true);
    expect('PriceInquiryStatusSchema' in contracts).toBe(true);
    expect('QuoteFollowUpStatusSchema' in contracts).toBe(true);
    expect('RunDueFollowUpsSchema' in contracts).toBe(true);
  });
});
