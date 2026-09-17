/**
 * Safe parsing of the `ResearchRun.checkpoint` JSONB value.
 *
 * The checkpoint is persisted as `unknown`. The dashboard must never invent a
 * value: an absent or malformed field is reported as unavailable (empty), and
 * malformed entries are counted so the UI can say so instead of guessing.
 */

export interface CoverageCell {
  targetMarketId: string;
  dimension: string;
  status: string;
  note: string | null;
}

export interface PendingFollowUp {
  kind: string;
  ref: string;
  note: string | null;
}

export interface CheckpointView {
  /** True when a checkpoint object was recorded at all. */
  present: boolean;
  /** Recorded free-text notes verbatim; null when not recorded. */
  notes: string | null;
  coverage: CoverageCell[];
  pendingFollowUps: PendingFollowUp[];
  malformedCoverage: number;
  malformedFollowUps: number;
}

const EMPTY: CheckpointView = {
  present: false,
  notes: null,
  coverage: [],
  pendingFollowUps: [],
  malformedCoverage: 0,
  malformedFollowUps: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseCoverage(value: unknown): {
  cells: CoverageCell[];
  malformed: number;
} {
  if (!Array.isArray(value)) {
    return { cells: [], malformed: 0 };
  }
  const cells: CoverageCell[] = [];
  let malformed = 0;
  for (const entry of value) {
    if (!isRecord(entry)) {
      malformed++;
      continue;
    }
    const targetMarketId = readText(entry.targetMarketId);
    const dimension = readText(entry.dimension);
    const status = readText(entry.status);
    if (!targetMarketId || !dimension || !status) {
      malformed++;
      continue;
    }
    cells.push({
      targetMarketId,
      dimension,
      status,
      note: readText(entry.note),
    });
  }
  return { cells, malformed };
}

function parseFollowUps(value: unknown): {
  items: PendingFollowUp[];
  malformed: number;
} {
  if (!Array.isArray(value)) {
    return { items: [], malformed: 0 };
  }
  const items: PendingFollowUp[] = [];
  let malformed = 0;
  for (const entry of value) {
    if (!isRecord(entry)) {
      malformed++;
      continue;
    }
    const kind = readText(entry.kind);
    const ref = readText(entry.ref);
    if (!kind || !ref) {
      malformed++;
      continue;
    }
    items.push({ kind, ref, note: readText(entry.note) });
  }
  return { items, malformed };
}

/** Parses the checkpoint value without inventing any field. */
export function parseCheckpoint(value: unknown): CheckpointView {
  if (!isRecord(value)) {
    return { ...EMPTY };
  }
  const coverage = parseCoverage(value.coverage);
  const followUps = parseFollowUps(value.pendingFollowUps);
  return {
    present: true,
    notes: readText(value.notes),
    coverage: coverage.cells,
    pendingFollowUps: followUps.items,
    malformedCoverage: coverage.malformed,
    malformedFollowUps: followUps.malformed,
  };
}

/** Human-readable recorded usage/limits: the checkpoint notes verbatim, if any. */
export function recordedNotes(view: CheckpointView): string | null {
  return view.notes;
}
