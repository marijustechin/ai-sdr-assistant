import { describe, it, expect } from 'vitest';
import {
  OUTREACH_EXCLUDING_DECISIONS,
  OutreachDecisionResponseSchema,
  SetOutreachDecisionSchema,
} from '../src/index.js';

describe('outreach decision contracts', () => {
  it('accepts every decision state with an optional note', () => {
    for (const decision of [
      'ELIGIBLE',
      'DO_NOT_CONTACT',
      'EXISTING_RELATIONSHIP',
      'NOT_RELEVANT',
      'ALREADY_CONTACTED',
    ] as const) {
      expect(SetOutreachDecisionSchema.safeParse({ decision }).success).toBe(
        true,
      );
    }
    expect(
      SetOutreachDecisionSchema.safeParse({
        decision: 'DO_NOT_CONTACT',
        note: 'Asked us to stop.',
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown decision or an unexpected field', () => {
    expect(
      SetOutreachDecisionSchema.safeParse({ decision: 'BLACKLIST' }).success,
    ).toBe(false);
    expect(
      SetOutreachDecisionSchema.safeParse({
        decision: 'ELIGIBLE',
        companyId: 'x',
      }).success,
    ).toBe(false);
  });

  it('lists exactly the excluding states (ELIGIBLE is not excluding)', () => {
    expect(new Set(OUTREACH_EXCLUDING_DECISIONS)).toEqual(
      new Set([
        'DO_NOT_CONTACT',
        'EXISTING_RELATIONSHIP',
        'NOT_RELEVANT',
        'ALREADY_CONTACTED',
      ]),
    );
    expect((OUTREACH_EXCLUDING_DECISIONS as readonly string[]).includes('ELIGIBLE')).toBe(
      false,
    );
  });

  it('validates the human-provenance response shape', () => {
    expect(
      OutreachDecisionResponseSchema.safeParse({
        id: 'd1',
        opportunityId: 'o1',
        companyId: 'c1',
        decision: 'EXISTING_RELATIONSHIP',
        note: null,
        decidedByKind: 'HUMAN',
        decidedAt: '2026-09-25T00:00:00.000Z',
        createdAt: '2026-09-25T00:00:00.000Z',
        updatedAt: '2026-09-25T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      OutreachDecisionResponseSchema.safeParse({
        id: 'd1',
        decidedByKind: 'AGENT',
      }).success,
    ).toBe(false);
  });
});
