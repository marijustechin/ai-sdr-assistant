#!/usr/bin/env node
// verify-docs.mjs — deterministic documentation/state consistency check.
//
// This is NOT an AI heuristic and does NOT parse arbitrary prose. It reads a
// small set of canonical files and enforces explicit, machine-readable
// invariants between `ops/`, the canonical `docs/system/**`, the READMEs, and
// the committed code tree. See docs/system/source-of-truth.md.
//
// Usage: node scripts/verify-docs.mjs
// Exit code: 0 when no FAIL, 1 when any FAIL.
//
// No network, no dependencies, no writes.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

let PASS = 0;
let FAIL = 0;
let WARN = 0;
const ok = (m) => { console.log(`PASS  ${m}`); PASS++; };
const bad = (m) => { console.log(`FAIL  ${m}`); FAIL++; };
const warn = (m) => { console.log(`WARN  ${m}`); WARN++; };

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel) => existsSync(join(ROOT, rel));

// The "archive required" boundary is read from a machine-readable marker in
// ops/backlog.md (`archive-required-from=O-<n>`) rather than hardcoded, so the
// convention can be re-epoch'd without touching code. When the marker is
// absent, the archive-presence rule is disabled with a warning.
const oNum = (id) => Number.parseInt(id.replace(/^O-/, ''), 10);
let archiveRequiredFrom = null;

// --- 1. Required canonical files/dirs ---------------------------------------

const REQUIRED = [
  'AGENTS.md',
  'README.md',
  'ops/README.md',
  'ops/current.md',
  'ops/backlog.md',
  'ops/task-template.md',
  'docs/README.md',
  'docs/system/source-of-truth.md',
  'docs/system/project-state.md',
  'docs/system/module-map.md',
  'docs/system/architecture.md',
  'docs/system/decisions.md',
  'docs/system/data-governance.md',
  'docs/system/research-context-contract.md',
  'docs/system/research-toolchain.md',
  'docs/system/research-harness/AGENTS.md',
  'soft/README.md',
  'soft/AGENTS.md',
  'soft/packages/database/prisma/schema.prisma',
  'soft/packages/contracts/src/index.ts',
  'soft/scripts/verify.sh',
  'scripts/verify-docs.mjs',
];

for (const f of REQUIRED) {
  if (exists(f)) ok(`present: ${f}`);
  else bad(`missing required file: ${f}`);
}
const REQUIRED_DIRS = [
  'ops/done',
  'soft/apps/api/src/modules',
  'soft/apps/web/app',
  'soft/packages/database/prisma/migrations',
  'soft/tasks/done',
];
for (const d of REQUIRED_DIRS) {
  if (exists(d)) ok(`present: ${d}`);
  else bad(`missing required directory: ${d}`);
}

// --- helpers ----------------------------------------------------------------

const ACTIVE_STATUSES = new Set(['IN_PROGRESS', 'BLOCKED', 'READY_FOR_HUMAN_REVIEW']);
const TERMINAL_STATUSES = new Set(['ACCEPTED', 'DONE', 'CLOSED', 'COMPLETE']);
const STATUS_PATTERN = /\*\*Status:\*\*\s*([A-Z_]+)/;
const TASK_ID_PATTERN = /\*\*Task ID:\*\*\s*(O-\d+|none)\b/i;

function section(text, name) {
  const re = new RegExp(`^##\\s+${name}\\s*$`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  const rest = text.slice(m.index + m[0].length);
  const next = rest.search(/^##\s/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function oIds(text) {
  const set = new Set();
  for (const m of text.matchAll(/\bO-\d{1,4}\b/g)) set.add(m[0]);
  return set;
}

const listDoneFiles = () =>
  existsSync(join(ROOT, 'ops/done'))
    ? readdirSync(join(ROOT, 'ops/done')).filter((f) => f.endsWith('.md'))
    : [];

// --- 2. ops/current.md markers ----------------------------------------------

let currentId = null;
let currentStatus = null;
try {
  const cur = read('ops/current.md');
  const idM = cur.match(TASK_ID_PATTERN);
  const stM = cur.match(STATUS_PATTERN);
  if (!idM) bad('ops/current.md: missing machine-readable **Task ID:** line');
  if (!stM) bad('ops/current.md: missing machine-readable **Status:** line');
  if (idM && stM) {
    currentId = idM[1].toLowerCase() === 'none' ? null : idM[1].toUpperCase();
    currentStatus = stM[1].toUpperCase();
    ok(`ops/current.md markers parsed: Task ID=${currentId ?? 'none'}, Status=${currentStatus}`);
    if (TERMINAL_STATUSES.has(currentStatus)) {
      bad(`ops/current.md holds a terminal status (${currentStatus}); archive the task and reset current.md to the idle form`);
    } else if (currentStatus === 'NONE') {
      if (currentId !== null) bad('ops/current.md Status NONE but a real Task ID is set');
    } else if (!ACTIVE_STATUSES.has(currentStatus)) {
      bad(`ops/current.md has an unknown status '${currentStatus}'`);
    } else if (currentId === null) {
      bad(`ops/current.md Status ${currentStatus} but Task ID is none`);
    }
  }
} catch (e) {
  bad(`cannot read ops/current.md: ${e.message}`);
}

// --- 3. backlog Active / Completed ------------------------------------------

let activeSet = new Set();
let completedSet = new Set();
try {
  const backlog = read('ops/backlog.md');
  const active = section(backlog, 'Active');
  const completed = section(backlog, 'Completed');
  if (active === null) bad('ops/backlog.md: missing ## Active section');
  if (completed === null) bad('ops/backlog.md: missing ## Completed section');
  if (active !== null) activeSet = oIds(active);
  if (completed !== null) completedSet = new Set(oIds(completed));

  const both = [...activeSet].filter((id) => completedSet.has(id));
  if (both.length) bad(`ops/backlog.md: task(s) both Active and Completed: ${both.join(', ')}`);
  else ok('ops/backlog.md: no task is both Active and Completed');

  const expectedActive = currentId ? new Set([currentId]) : new Set();
  const activeDiff = [...activeSet].filter((id) => !expectedActive.has(id))
    .concat([...expectedActive].filter((id) => !activeSet.has(id)));
  if (activeDiff.length) {
    bad(`ops/backlog.md: ## Active (${[...activeSet].join(', ') || 'none'}) does not match ops/current.md (${currentId ?? 'none'})`);
  } else {
    ok(`ops/backlog.md: ## Active matches ops/current.md (${currentId ?? 'none'})`);
  }

  if (currentId && completedSet.has(currentId)) {
    bad(`ops/current.md task ${currentId} is already listed under ## Completed`);
  }

  // Active task must not also have an archived record.
  if (currentId) {
    const archived = listDoneFiles().filter((f) =>
      new RegExp(`\\*\\*Task ID:\\*\\*\\s*${currentId}\\b`).test(read(`ops/done/${f}`)));
    if (archived.length) bad(`ops/current.md task ${currentId} also has an archive (${archived.join(', ')})`);
  }

  // Completed tasks (post-convention) must have an archive record. The
  // boundary is declared in the backlog itself, not hardcoded.
  const boundary = backlog.match(/archive-required-from=O-(\d+)/);
  if (boundary) {
    archiveRequiredFrom = Number(boundary[1]);
  } else {
    warn('ops/backlog.md has no "archive-required-from=O-<n>" marker; skipping archive-presence enforcement');
  }
  for (const id of completedSet) {
    if (archiveRequiredFrom === null || oNum(id) < archiveRequiredFrom) continue;
    const has = listDoneFiles().some((f) =>
      new RegExp(`\\*\\*Task ID:\\*\\*\\s*${id}\\b`).test(read(`ops/done/${f}`)));
    if (has) ok(`ops/done/ has a record for ${id}`);
    else bad(`ops/done/ has no record for completed ${id}`);
  }

  // Every recorded commit hash in the Completed section must exist in git.
  // A backticked all-digit token shorter than 40 chars is skipped so date-like
  // values are never misread as commit hashes.
  const hashes = new Set();
  if (completed !== null) {
    for (const m of completed.matchAll(/`([0-9a-f]{7,40})`/g)) {
      if (/^\d+$/.test(m[1]) && m[1].length !== 40) continue;
      hashes.add(m[1]);
    }
  }
  if (hashes.size) {
    let gitOk = true;
    for (const h of hashes) {
      try {
        execFileSync('git', ['cat-file', '-e', `${h}^{commit}`], { cwd: ROOT, stdio: 'ignore' });
      } catch {
        gitOk = false;
        bad(`ops/backlog.md records commit ${h}, which is not a commit in this repository`);
      }
    }
    if (gitOk) ok(`ops/backlog.md commit hashes verified against git (${hashes.size})`);
  }
} catch (e) {
  bad(`cannot read ops/backlog.md: ${e.message}`);
}

// --- 4. project-state.md Last updated date ----------------------------------

try {
  const ps = read('docs/system/project-state.md');
  const header = ps.match(/Last updated\s+(\d{4}-\d{2}-\d{2})/);
  if (!header) {
    bad('docs/system/project-state.md: missing "Last updated YYYY-MM-DD"');
  } else {
    const declared = header[1];
    const dates = [...ps.matchAll(/\b(20\d\d-\d\d-\d\d)\b/g)].map((m) => m[1]);
    const max = dates.sort().at(-1);
    if (max && declared < max) {
      bad(`docs/system/project-state.md: Last updated ${declared} is older than the newest dated entry ${max}`);
    } else {
      ok(`docs/system/project-state.md: Last updated ${declared} (>= newest entry ${max ?? 'n/a'})`);
    }
  }
} catch (e) {
  bad(`cannot read docs/system/project-state.md: ${e.message}`);
}

// --- 5. architecture.md module table vs code tree ---------------------------

try {
  const arch = read('docs/system/architecture.md');
  const rows = arch.split('\n').filter((l) => l.trim().startsWith('|'));
  const moduleDirs = readdirSync(join(ROOT, 'soft/apps/api/src/modules'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const dir of moduleDirs) {
    const row = rows.find((l) => l.includes('`' + dir + '`'));
    if (!row) {
      bad(`docs/system/architecture.md: module table has no row for existing module '${dir}'`);
      continue;
    }
    const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
    const status = (cells.at(-1) || '').toLowerCase();
    if (!status.startsWith('implemented')) {
      bad(`docs/system/architecture.md: '${dir}' exists in code but is marked '${status || 'unknown'}' (expected implemented/implemented-subset)`);
    }
  }
  ok(`docs/system/architecture.md: checked ${moduleDirs.length} module rows against the code tree`);
} catch (e) {
  bad(`cannot check docs/system/architecture.md module table: ${e.message}`);
}

// --- 6. README placeholder drift --------------------------------------------

try {
  if (exists('soft/apps/web/app')) {
    const softReadme = read('soft/README.md');
    if (/planned UI|implementation deferred/i.test(softReadme)) {
      bad('soft/README.md calls apps/web planned/deferred while soft/apps/web/app exists');
    } else {
      ok('soft/README.md does not call the implemented web app planned/deferred');
    }
  }
} catch (e) {
  bad(`cannot check soft/README.md: ${e.message}`);
}

// --- 7. ops/done records carry markers (warn only) --------------------------

try {
  const missing = listDoneFiles().filter((f) => !/\*\*Task ID:\*\*\s*O-\d+/.test(read(`ops/done/${f}`)));
  if (missing.length) {
    warn(`ops/done records without a **Task ID:** marker (historical, not enforced): ${missing.length} file(s); add the marker when a record is next touched`);
  } else {
    ok('all ops/done records carry a **Task ID:** marker');
  }
} catch (e) {
  warn(`could not scan ops/done markers: ${e.message}`);
}

// --- summary ----------------------------------------------------------------

console.log('');
console.log(`verify-docs summary: ${PASS} passed, ${FAIL} failed, ${WARN} warnings`);
if (FAIL > 0) {
  console.log(`FAILURE: ${FAIL} documentation consistency check(s) failed.`);
  process.exit(1);
}
console.log('OK: documentation consistency invariants hold.');
