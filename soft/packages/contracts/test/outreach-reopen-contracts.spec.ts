import { describe, it, expect } from 'vitest';
import { ReopenOutreachBatchSchema } from '../src/index.js';

describe('reopen approved outreach batch contracts', () => {
  it('accepts an empty request (customized drafts protected by default)', () => {
    expect(ReopenOutreachBatchSchema.safeParse({}).success).toBe(true);
    expect(
      ReopenOutreachBatchSchema.safeParse({ resetCustomized: true }).success,
    ).toBe(true);
    expect(
      ReopenOutreachBatchSchema.safeParse({ resetCustomized: false }).success,
    ).toBe(true);
  });

  it('rejects non-boolean and unknown fields', () => {
    expect(
      ReopenOutreachBatchSchema.safeParse({ resetCustomized: 'yes' }).success,
    ).toBe(false);
    expect(
      ReopenOutreachBatchSchema.safeParse({ status: 'DRAFT' }).success,
    ).toBe(false);
  });
});
