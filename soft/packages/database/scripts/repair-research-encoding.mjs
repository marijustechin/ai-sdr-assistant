#!/usr/bin/env node
// repair-research-encoding.mjs
//
// Bounded, idempotent, compare-and-swap repair of KNOWN encoding-damaged
// research text in the central database. This is an auditable data-maintenance
// script owned by the single schema owner (`packages/database`); raw SQL is
// permitted only inside this package (soft/AGENTS.md §3).
//
// Authorization: human-authorized under manager task O-016
// (`ops/current.md` + `soft/tasks/current.md`). It touches ONLY the explicit
// allowlist below; evidence and source_references are otherwise immutable. It
// never edits historical prices or specifications, `retrievedAt`, claim
// lifecycle, the research run, or any non-targeted column.
//
// Usage:
//   node scripts/repair-research-encoding.mjs --out <dir-outside-git> [--dry-run]
//
// `--out` must be a directory OUTSIDE the repository (undo data is kept outside
// Git). The script writes a JSON record containing the exact before/after values
// so every change is reversible per row.
//
// Recovery semantics:
//   * research_queries.query_text : reversible single CP1252<->UTF-8 round trip
//     (`convert_from(convert_to(text,'WIN1252'),'UTF8')`); refused if the result
//     is unchanged, still contains U+FFFD, or is not representable.
//   * text fields                : U+FFFD + '-' -> 'ė' (U+0117), confirmed
//     against the original source URL; refused if ANY U+FFFD is not part of a
//     `U+FFFD-` pair (never guess a character).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';

const { Client } = pg;

const FFFD = '\uFFFD';
const E_DOT = '\u0117'; // ė

const QUERY_TARGETS = [
  { id: '3487472b-57f0-4cb4-ad82-f5b9de506c21' },
  { id: '6160aabc-d86b-40f7-8a4b-dd5dca79a2ec' },
  { id: '0b53f12a-6ee4-4587-b915-086228257913' },
  { id: '424f26fc-6ea7-41a5-98d7-50ae641f60c0' },
];

const TEXT_TARGETS = [
  { table: 'source_references', column: 'title', id: 'e0bd06b4-bc52-4407-b826-b15aef5ac29e' },
  { table: 'source_references', column: 'title', id: '9bb0301a-1f01-4096-a892-9873ac9d1bde' },
  { table: 'source_references', column: 'publisher', id: 'b598d75b-2ac5-401c-b885-dd09baad84ee' },
  { table: 'evidence', column: 'evidence_text', id: 'ae33d1e0-896a-4038-95fe-412841acd390' },
  { table: 'evidence', column: 'evidence_text', id: '904003c6-d42c-418d-b94e-e92b9d7e6a9b' },
  { table: 'evidence', column: 'evidence_text', id: 'd980cdd2-0831-405c-8491-e7cf1665e9fd' },
];

// Second, separately human-authorized set (2026-09-17, O-016 follow-up): restore
// diacritics that were silently best-fit-stripped with NO U+FFFD marker. Every
// `from` token was verified against the live source page. Tokens are literal and
// applied longest-first so a shorter key cannot corrupt a longer word. The 9
// search queries were deliberately excluded (ASCII may be intentional). Each
// field is compare-and-swap on its exact current value; a field with no `from`
// token present is a no-op.
const RESTORE_TARGETS = [
  { table: 'source_references', column: 'title', id: '4fd5345d-4fb0-4b5f-aab8-88c4e71c5461', fixes: [['dailylentes', 'dailylentės']] },
  { table: 'source_references', column: 'title', id: '346384f3-3ee2-4f52-ad9a-32c0708e10fa', fixes: [['dailylente', 'dailylentės']] },
  { table: 'source_references', column: 'title', id: 'bfd3949e-b0ad-4fbe-9853-0b7ba1abe82e', fixes: [['dailylente', 'dailylentė']] },
  { table: 'source_references', column: 'title', id: 'b598d75b-2ac5-401c-b885-dd09baad84ee', fixes: [['dailylentes', 'dailylentės'], ['rusis', 'rūšis']] },
  { table: 'claims', column: 'statement', id: 'a19cb76e-7e9a-44da-998e-420ed8e09c0b', fixes: [['dailylente', 'dailylentė']] },
  { table: 'evidence', column: 'evidence_text', id: '5c5b776a-de90-48b9-9b76-c90e69f01a3d', fixes: [['dailylente', 'dailylentė']] },
  { table: 'evidence', column: 'evidence_text', id: '3fd115ea-fd03-44c8-9a71-ac3ca9347d3f', fixes: [['dailylente', 'dailylentė'], ['SIUO METU SANDELYJE NETURIME', 'ŠIUO METU SANDĖLYJE NETURIME']] },
  { table: 'evidence', column: 'evidence_text', id: 'aa0fa02b-0f40-4382-9e4d-8474ab6eca43', fixes: [['dailylente', 'dailylentė']] },
  { table: 'evidence', column: 'evidence_text', id: '2dd89b6c-cf3d-48ac-9385-7b8dfc588cae', fixes: [['lampokasitellysta', 'lämpökäsitellystä'], ['LAMPOKASITELTY', 'LÄMPÖKÄSITELTY'], ['NAYTE', 'NÄYTE']] },
  { table: 'evidence', column: 'evidence_text', id: '78cc5147-518b-4d14-ab05-0fbde482d25b', fixes: [['lampokasiteltyna', 'lämpökäsiteltynä'], ['seinapaneeleja', 'seinäpaneeleja'], ['Lampokasiteltu', 'Lämpökäsitelty'], ['katto-ja', 'katto- ja'], ['seina-ja', 'seinä- ja'], ['varissa', 'värissä'], ['myos', 'myös']] },
  { table: 'evidence', column: 'evidence_text', id: 'e3a996ec-e2d0-4e68-9dfd-8286862a96d1', fixes: [['lampokasiteltya', 'lämpökäsiteltyä'], ['Ylojarvi', 'Ylöjärvi']] },
  { table: 'evidence', column: 'evidence_text', id: '3982162b-95d6-4d15-a082-401b3580715e', fixes: [['pintakasiteltyna', 'pintakäsiteltynä'], ['lampokasitelty', 'lämpökäsitelty'], ['ulkokayttoon', 'ulkokäyttöön'], ['myos', 'myös']] },
];

function applyFixes(value, fixes) {
  const present = fixes.filter(([from]) => value.includes(from));
  if (present.length === 0) return { status: 'noop', after: value };
  const ordered = [...present].sort((a, b) => b[0].length - a[0].length);
  let after = value;
  for (const [from, to] of ordered) after = after.split(from).join(to);
  return { status: after === value ? 'noop' : 'repair', after, applied: present.length };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = resolve(import.meta.dirname, '../../../.env');
  if (existsSync(envPath)) {
    const line = readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('DATABASE_URL='));
    if (line) return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('DATABASE_URL is not configured (set the env var or soft/.env)');
}

function safeDbName(url) {
  try {
    return new URL(url.replace(/^postgres(ql)?:/, 'http:')).pathname.replace(/^\//, '') || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Every U+FFFD must be immediately followed by '-' (the confirmed damage). */
function repairFffd(value) {
  const total = [...value].filter((c) => c === FFFD).length;
  const paired = value.split(`${FFFD}-`).length - 1;
  if (total === 0) return { status: 'noop', after: value, total, paired };
  if (paired !== total) return { status: 'unresolved', after: value, total, paired };
  const after = value.split(`${FFFD}-`).join(E_DOT);
  if (after.includes(FFFD)) return { status: 'unresolved', after, total, paired };
  return { status: 'repair', after, total, paired };
}

async function main() {
  const outDir = arg('--out');
  const dryRun = process.argv.includes('--dry-run');
  if (!outDir) {
    console.error('Missing required --out <dir-outside-git>');
    process.exit(2);
  }
  mkdirSync(outDir, { recursive: true });

  const url = loadDatabaseUrl();
  const client = new Client({ connectionString: url, ssl: false });
  await client.connect();

  const results = [];
  const summary = { repair: 0, noop: 0, unresolved: 0, missing: 0, conflict: 0 };

  try {
    await client.query('BEGIN');
    // Idempotency guard: `convert_to(text,'WIN1252')` raises if the value already
    // contains a character with no WIN1252 equivalent (i.e. it is already the
    // corrected text). Wrap it so an already-clean value yields NULL => no-op,
    // and re-running the script never aborts or mutates anything.
    await client.query(
      `CREATE OR REPLACE FUNCTION pg_temp.try_cp1252_roundtrip(t text) RETURNS text AS $$
         BEGIN
           RETURN convert_from(convert_to(t, 'WIN1252'), 'UTF8');
         EXCEPTION WHEN others THEN
           RETURN NULL;
         END;
       $$ LANGUAGE plpgsql`,
    );

    for (const target of QUERY_TARGETS) {
      const entry = { kind: 'double-encoded', table: 'research_queries', column: 'query_text', id: target.id };
      const cur = await client.query('SELECT query_text FROM research_queries WHERE id = $1', [target.id]);
      if (cur.rowCount === 0) {
        entry.status = 'missing';
      } else {
        const before = cur.rows[0].query_text;
        const tx = await client.query('SELECT pg_temp.try_cp1252_roundtrip($1) AS fixed', [before]);
        const after = tx.rows[0].fixed;
        if (after == null || after === before) entry.status = 'noop';
        else if (after.includes(FFFD)) entry.status = 'unresolved';
        else entry.status = 'repair';
        entry.before = before;
        entry.after = after;
        if (entry.status === 'repair' && !dryRun) {
          const upd = await client.query(
            'UPDATE research_queries SET query_text = $3 WHERE id = $1 AND query_text = $2',
            [target.id, before, after],
          );
          entry.rowsAffected = upd.rowCount;
          if (upd.rowCount !== 1) entry.status = 'conflict';
        }
      }
      summary[entry.status] = (summary[entry.status] ?? 0) + 1;
      results.push(entry);
    }

    for (const target of TEXT_TARGETS) {
      const entry = { kind: 'replacement-char', table: target.table, column: target.column, id: target.id };
      const col = target.column;
      const cur = await client.query(`SELECT "${col}" AS value FROM "${target.table}" WHERE id = $1`, [target.id]);
      if (cur.rowCount === 0 || cur.rows[0].value == null) {
        entry.status = 'missing';
      } else {
        const before = cur.rows[0].value;
        const r = repairFffd(before);
        entry.status = r.status;
        entry.fffdTotal = r.total;
        entry.fffdPaired = r.paired;
        entry.before = before;
        entry.after = r.after;
        if (r.status === 'repair' && !dryRun) {
          const upd = await client.query(
            `UPDATE "${target.table}" SET "${col}" = $3 WHERE id = $1 AND "${col}" = $2`,
            [target.id, before, r.after],
          );
          entry.rowsAffected = upd.rowCount;
          if (upd.rowCount !== 1) entry.status = 'conflict';
        }
      }
      summary[entry.status] = (summary[entry.status] ?? 0) + 1;
      results.push(entry);
    }

    for (const target of RESTORE_TARGETS) {
      const entry = { kind: 'diacritic-restore', table: target.table, column: target.column, id: target.id };
      const col = target.column;
      const cur = await client.query(`SELECT "${col}" AS value FROM "${target.table}" WHERE id = $1`, [target.id]);
      if (cur.rowCount === 0 || cur.rows[0].value == null) {
        entry.status = 'missing';
      } else {
        const before = cur.rows[0].value;
        const r = applyFixes(before, target.fixes);
        entry.status = r.status;
        entry.appliedFixes = r.applied ?? 0;
        entry.before = before;
        entry.after = r.after;
        if (r.status === 'repair' && !dryRun) {
          const upd = await client.query(
            `UPDATE "${target.table}" SET "${col}" = $3 WHERE id = $1 AND "${col}" = $2`,
            [target.id, before, r.after],
          );
          entry.rowsAffected = upd.rowCount;
          if (upd.rowCount !== 1) entry.status = 'conflict';
        }
      }
      summary[entry.status] = (summary[entry.status] ?? 0) + 1;
      results.push(entry);
    }

    if (dryRun) await client.query('ROLLBACK');
    else await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    console.error(`ABORTED (no changes committed): ${err.message}`);
    process.exit(1);
  }

  await client.end();

  const record = {
    task: 'O-016',
    script: 'packages/database/scripts/repair-research-encoding.mjs',
    appliedAt: new Date().toISOString(),
    dryRun,
    database: safeDbName(url),
    summary,
    targets: results,
  };
  const stamp = record.appliedAt.replace(/[:.]/g, '-');
  const file = resolve(outDir, `${stamp}-research-text-encoding${dryRun ? '-dryrun' : ''}.json`);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

  console.log(`mode=${dryRun ? 'dry-run' : 'applied'} database=${record.database}`);
  console.log(`summary=${JSON.stringify(summary)}`);
  console.log(`record=${file}`);
  for (const r of results) {
    const label = `${r.table}.${r.column} ${r.id}`;
    if (r.status === 'repair') console.log(`REPAIR  ${label}`);
    else if (r.status === 'noop') console.log(`NOOP    ${label}`);
    else console.log(`${r.status.toUpperCase()}  ${label}`);
  }
  if (summary.unresolved > 0 || summary.conflict > 0 || summary.missing > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`FAILED: ${err.message}`);
  process.exit(1);
});
