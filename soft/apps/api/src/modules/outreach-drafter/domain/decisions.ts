import {
  OUTREACH_EXCLUDING_DECISIONS,
  type OutreachDecisionStatus,
} from '@ai-sdr/contracts';

const EXCLUDING = new Set<string>(OUTREACH_EXCLUDING_DECISIONS);

/**
 * True when a human outreach decision excludes the company from outreach for
 * its scope. `ELIGIBLE` is the only non-excluding state; every other state
 * overrides the agent qualification and blocks outreach drafting.
 */
export function isExcludingOutreachDecision(
  decision: OutreachDecisionStatus,
): boolean {
  return EXCLUDING.has(decision);
}
