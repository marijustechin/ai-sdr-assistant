import type { AssertableFact, RedactedFact } from '@ai-sdr/contracts';

/**
 * Structural view of a `product_facts` row needed for assembly. Kept local so
 * the assembler does not depend on another module's internal types.
 */
export interface FactLike {
  id: string;
  productId: string | null;
  offerId: string | null;
  key: string;
  valueText: string | null;
  valueNumeric: number | null;
  unit: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'SUPERSEDED';
  visibility: 'OPERATIONAL' | 'RESTRICTED';
  sourceLabel: string | null;
  updatedAt: Date;
}

export interface AssembledFacts {
  confirmed: AssertableFact[];
  pending: RedactedFact[];
  restricted: RedactedFact[];
  unknowns: string[];
}

/**
 * Enforces the canonical redaction mapping at assembly time:
 *
 * - CONFIRMED + OPERATIONAL → `confirmed` (value + source metadata);
 * - PENDING (any visibility) → `pending` (value withheld);
 * - RESTRICTED (any status) → `restricted` (value withheld);
 * - SUPERSEDED → absent entirely (audit history only).
 */
export function assembleFacts(facts: FactLike[]): AssembledFacts {
  const confirmed: AssertableFact[] = [];
  const pending: RedactedFact[] = [];
  const restricted: RedactedFact[] = [];
  const unknownKeys: string[] = [];

  for (const fact of facts) {
    if (fact.status === 'SUPERSEDED') {
      continue;
    }

    const subject: 'PRODUCT' | 'OFFER' =
      fact.productId !== null ? 'PRODUCT' : 'OFFER';
    const subjectId = fact.productId ?? fact.offerId ?? '';

    if (fact.visibility === 'RESTRICTED') {
      restricted.push({
        id: fact.id,
        subject,
        subjectId,
        key: fact.key,
        status: 'RESTRICTED',
        version: 1,
        explanation: 'value withheld: RESTRICTED',
      });
      unknownKeys.push(fact.key);
      continue;
    }

    if (fact.status === 'PENDING') {
      pending.push({
        id: fact.id,
        subject,
        subjectId,
        key: fact.key,
        status: 'PENDING',
        version: 1,
        explanation: 'value withheld: PENDING',
      });
      unknownKeys.push(fact.key);
      continue;
    }

    confirmed.push({
      id: fact.id,
      subject,
      subjectId,
      key: fact.key,
      status: 'CONFIRMED',
      version: 1,
      value:
        fact.valueText ??
        (fact.valueNumeric !== null ? String(fact.valueNumeric) : ''),
      ...(fact.unit !== null ? { unit: fact.unit } : {}),
      ...(fact.sourceLabel !== null ? { sourceLabel: fact.sourceLabel } : {}),
      confirmedAt: fact.updatedAt.toISOString(),
      asOf: fact.updatedAt.toISOString(),
      evidence: [],
    });
  }

  return {
    confirmed,
    pending,
    restricted,
    unknowns: [...new Set(unknownKeys)],
  };
}
