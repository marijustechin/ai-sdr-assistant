import type { CreateFactData } from './types.js';

/** Raised when a product fact violates a domain invariant. */
export class InvalidFactError extends Error {}

/**
 * Pure domain invariants for entering a product fact. Mirrors the database
 * CHECK constraints plus the authoring rules from the research-context contract:
 * a fact has exactly one subject, carries a value, is never created as
 * SUPERSEDED, and a CONFIRMED fact carries a source label.
 */
export function assertFactInvariants(input: CreateFactData): void {
  const subjects = [input.productId, input.offerId].filter(
    (value) => value !== undefined && value !== null && value !== '',
  );
  if (subjects.length !== 1) {
    throw new InvalidFactError(
      'A fact must belong to exactly one of productId or offerId.',
    );
  }

  if (input.valueText === undefined && input.valueNumeric === undefined) {
    throw new InvalidFactError(
      'A fact must carry a valueText or valueNumeric.',
    );
  }

  if (input.status === 'SUPERSEDED') {
    throw new InvalidFactError(
      'SUPERSEDED is not a valid initial fact status.',
    );
  }

  if (
    input.status === 'CONFIRMED' &&
    (input.sourceLabel === undefined || input.sourceLabel.trim().length === 0)
  ) {
    throw new InvalidFactError('A CONFIRMED fact requires a sourceLabel.');
  }
}
