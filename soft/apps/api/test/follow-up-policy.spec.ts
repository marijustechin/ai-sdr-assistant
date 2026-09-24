import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOLLOW_UP_POLICY,
  isExpired,
  nextCheckAt,
  resolveFollowUpPolicy,
} from '../src/modules/quote-collection/domain/follow-up-policy.js';

const SENT = new Date('2026-09-24T10:00:00.000Z');

describe('follow-up policy', () => {
  it('schedules checks at 24h / 48h / 72h then stops', () => {
    const p = DEFAULT_FOLLOW_UP_POLICY;
    expect(nextCheckAt(SENT, 0, p)?.toISOString()).toBe(
      '2026-09-25T10:00:00.000Z',
    );
    expect(nextCheckAt(SENT, 1, p)?.toISOString()).toBe(
      '2026-09-26T10:00:00.000Z',
    );
    expect(nextCheckAt(SENT, 2, p)?.toISOString()).toBe(
      '2026-09-27T10:00:00.000Z',
    );
    expect(nextCheckAt(SENT, 3, p)).toBeNull();
  });

  it('expires after the 120h (5-day) window', () => {
    const p = DEFAULT_FOLLOW_UP_POLICY;
    expect(isExpired(SENT, new Date(SENT.getTime() + 119 * 3_600_000), p)).toBe(
      false,
    );
    expect(isExpired(SENT, new Date(SENT.getTime() + 120 * 3_600_000), p)).toBe(
      true,
    );
  });

  it('is env-overridable and falls back on invalid input', () => {
    expect(
      resolveFollowUpPolicy({
        FOLLOW_UP_CHECK_DELAYS_HOURS: '6,12',
        FOLLOW_UP_EXPIRY_HOURS: '48',
      } as NodeJS.ProcessEnv),
    ).toMatchObject({ checkDelaysHours: [6, 12], expiryHours: 48 });
    expect(
      resolveFollowUpPolicy({
        FOLLOW_UP_CHECK_DELAYS_HOURS: 'nonsense',
      } as NodeJS.ProcessEnv).checkDelaysHours,
    ).toEqual(DEFAULT_FOLLOW_UP_POLICY.checkDelaysHours);
  });
});
