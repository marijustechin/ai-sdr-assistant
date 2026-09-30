import type { OutreachReplyClassification } from '@ai-sdr/contracts';

/**
 * Deterministic, bounded reply classifier. It maps an inbound reply onto a small
 * fixed vocabulary using explicit phrase rules only — it never infers deal value,
 * purchasing intent, or anything beyond what the reply actually states. The
 * result is reviewable and may be overridden by a human.
 */

interface Rule {
  classification: OutreachReplyClassification;
  pattern: RegExp;
  reason: string;
}

// Order matters: auto-replies and routing problems are detected before
// commercial signals, and a clear refusal wins over a stray positive token.
const RULES: readonly Rule[] = [
  {
    classification: 'OUT_OF_OFFICE',
    reason: 'Auto-reply / out-of-office detected',
    pattern:
      /\b(out of (the )?office|automatic reply|auto-?reply|autoreply|on (annual|parental|maternity|sick| holiday) leave|away from (the )?office|currently away|metines atostogos|metin[eė]s atostogos|atostogauju|esu atostogose|i[sš]vyk[eę]s|neb[uū]siu darbe)\b/i,
  },
  {
    classification: 'WRONG_CONTACT',
    reason: 'Recipient reports the message reached the wrong contact',
    pattern:
      /\b(wrong (person|contact|department|address|recipient)|not the right (person|contact|department)|no longer (with|work(s|ing)? (for|at))|(has|have) left the (company|firm|organisation|organization)|i (have )?left the company|please (contact|write to|email|reach) (my colleague|our|the)|nepasieksite|neteisingas adresatas|nebedirba|nesu atsakingas|kreipkit[eė]s i)\b/i,
  },
  {
    classification: 'NOT_INTERESTED',
    reason: 'Reply declines interest',
    pattern:
      /\b(not interested|no interest|not relevant|we are not interested|we'?re not|no,? thank|no thanks|unsubscribe|remove me (from|please)|please remove|stop (sending|emailing)|do not (contact|email)|nesidomim|nedomina|nereikia|atsisakom|pra[sš]ome nebesi[uū]sti|nereikalinga)\b/i,
  },
  {
    classification: 'PRICE_REQUEST',
    reason: 'Reply asks for pricing / a quote',
    pattern:
      /\b(price|prices|pricing|pricelist|price list|quotation|quote|cost|costs|how much|per m2|per m2|eur\/|euro\/|discount terms|kain\w*|kiek kainuoja|pasi.{0,1}lym\w*)\b/i,
  },
  {
    classification: 'MORE_INFO',
    reason: 'Reply asks for more information / materials',
    pattern:
      /\b(more (info|information)|further information|more details|send (me )?(more )?(details|info|information|catalog|brochure|specification|spec sheet|datasheet|samples?)|technical (data|specification|details)|samples?\b|daugiau informacijos|smulkiau|katalog|specifikacij|pavyzd)\b/i,
  },
  {
    classification: 'INTERESTED',
    reason: 'Reply expresses interest',
    pattern:
      /\b(interested|we would like|we'?d like|i would like|i'?d like|would like to (receive|buy|order|discuss|learn)|please send|let'?s (discuss|talk)|schedule a (call|meeting)|arrange a (call|meeting)|call me|pabendrau\w*|susitik\w*|mielai|norime|nor[eė]tume|susidom[eė]j|domina|galime (aptarti|pasikalb[eė]ti)|susisiek)\b/i,
  },
];

/** Collapses quoted history and returns a short excerpt of the reply body. */
export function excerptOf(body: string, max = 240): string {
  const cleaned = body
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('>'))
    .join('\n');
  const withoutHistory = cleaned.split(
    /\n\s*(on .{0,80} wrote:|-----original message-----|-{2,}\s*original|nuo:?\s|from:\s)/i,
  )[0]!;
  const normalized = withoutHistory.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}…` : normalized;
}

export interface ReplyClassificationResult {
  classification: OutreachReplyClassification;
  reason: string;
  excerpt: string;
}

/**
 * Classifies a reply deterministically. `OTHER` is the safe default when no
 * bounded rule matches; the reply is still preserved for human review.
 */
export function classifyReply(
  subject: string | null | undefined,
  body: string,
): ReplyClassificationResult {
  const haystack = `${subject ?? ''}\n${body}`;
  for (const rule of RULES) {
    if (rule.pattern.test(haystack)) {
      return {
        classification: rule.classification,
        reason: rule.reason,
        excerpt: excerptOf(body),
      };
    }
  }
  return {
    classification: 'OTHER',
    reason: 'No bounded rule matched; needs human review',
    excerpt: excerptOf(body),
  };
}
