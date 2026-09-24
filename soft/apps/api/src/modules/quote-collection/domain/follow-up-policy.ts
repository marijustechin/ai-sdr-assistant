/**
 * Follow-up check policy for sent price inquiries (RFQs).
 *
 * Configurable (env-overridable) rather than scattered constants. Values are
 * **calendar hours** from the send time — there is deliberately no business-day
 * or holiday calendar in this slice. The default window (24h / 48h / 72h checks,
 * 120h expiry) is documented as "5 calendar days".
 *
 * Pure and I/O-free so it can be unit-tested.
 */

export interface FollowUpPolicy {
  /** Increasing reply-check delays (calendar hours) measured from the send time. */
  checkDelaysHours: number[];
  /** Total waiting window (calendar hours) after which a no-reply inquiry expires. */
  expiryHours: number;
  /** How long a worker's claim lease lasts (minutes) before it can be re-claimed. */
  leaseMinutes: number;
}

export const DEFAULT_FOLLOW_UP_POLICY: FollowUpPolicy = {
  checkDelaysHours: [24, 48, 72],
  expiryHours: 120,
  leaseMinutes: 15,
};

function parsePositiveInts(value: string | undefined, fallback: number[]): number[] {
  if (!value) return fallback;
  const parsed = value
    .split(',')
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parsed.length > 0
    ? parsed.sort((a, b) => a - b)
    : fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Resolves the follow-up policy from the environment (with sane defaults). */
export function resolveFollowUpPolicy(
  env: NodeJS.ProcessEnv = process.env,
): FollowUpPolicy {
  return {
    checkDelaysHours: parsePositiveInts(
      env.FOLLOW_UP_CHECK_DELAYS_HOURS,
      DEFAULT_FOLLOW_UP_POLICY.checkDelaysHours,
    ),
    expiryHours: parsePositiveInt(
      env.FOLLOW_UP_EXPIRY_HOURS,
      DEFAULT_FOLLOW_UP_POLICY.expiryHours,
    ),
    leaseMinutes: parsePositiveInt(
      env.FOLLOW_UP_LEASE_MINUTES,
      DEFAULT_FOLLOW_UP_POLICY.leaseMinutes,
    ),
  };
}

/**
 * The next check time given the number of attempts already made. `attemptCount`
 * is the count *before* the upcoming check. Returns `null` when the delay would
 * fall beyond the expiry window (the caller then expires the inquiry).
 */
export function nextCheckAt(
  sentAt: Date,
  attemptCount: number,
  policy: FollowUpPolicy,
): Date | null {
  const delay = policy.checkDelaysHours[attemptCount];
  if (delay === undefined) return null;
  const at = new Date(sentAt.getTime() + delay * 3_600_000);
  const expiry = new Date(sentAt.getTime() + policy.expiryHours * 3_600_000);
  return at.getTime() > expiry.getTime() ? null : at;
}

/** True once the whole waiting window has elapsed (no reply received). */
export function isExpired(
  sentAt: Date,
  now: Date,
  policy: FollowUpPolicy,
): boolean {
  return (
    now.getTime() >= sentAt.getTime() + policy.expiryHours * 3_600_000
  );
}
