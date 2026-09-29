/**
 * Builds the revision request body from the editor state. ONLY the subject and
 * the canonical body are ever sent — `body`/`htmlBody` are derived server-side
 * and must never be edited or uploaded independently.
 */
export interface OutreachDraftRevisionState {
  subject: string;
  canonicalBody: string;
}

export function buildRevisionPayload(
  state: OutreachDraftRevisionState,
): { subject?: string; canonicalBody?: string } {
  const payload: { subject?: string; canonicalBody?: string } = {};
  const subject = state.subject.trim();
  if (subject.length > 0) payload.subject = subject;
  const canonicalBody = state.canonicalBody.trim();
  if (canonicalBody.length > 0) payload.canonicalBody = canonicalBody;
  return payload;
}
