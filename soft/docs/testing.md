# Testing

**Status:** Live policy. Existing tests: API health + readiness endpoints and
API env loading (`apps/api/test/*.spec.ts`), plus the database-package
integration tests (`packages/database/test/*.spec.ts`), all run with vitest.
**Companion:** `AGENTS.md` (task loop), `harness.md` (dev harness), `security.md`, `data-model.md`.

This document defines test responsibilities, mandatory checks per task type,
and the evidence a task must record before it can be marked DONE.

---

## 1. Test Levels and Responsibilities

| Level | Scope | Runner | Responsibility |
|---|---|---|---|
| **Unit** | A single domain rule, value object, or pure function | `vitest` | Fast; no DB, no network, no I/O. |
| **Integration** | A module's application service wired to a real (or in-memory) repository | `vitest` | Proves service→repository wiring and boundary rules. |
| **Database / migration** | Prisma migrations + repository behaviour | integration harness against a disposable Postgres (Docker Compose) | Schema validity, single-writer constraints, uniqueness, rollback notes. |
| **API contract** | `apps/api` controllers + Zod validation + authorization | supertest/e2e harness (or Fastify `app.inject()`) | Success + failure paths; restricted facts never exposed. |
| **End-to-end** | A full task slice (e.g. market research end-to-end) | manual or scripted | Only when the slice is complete; never against production. |

All levels use the **same** shared contracts (`packages/contracts`). A contract
test at one level must not drift from the others.

---

## 2. Mandatory Checks per Task Type

| Task touches | Mandatory checks |
|---|---|
| Domain logic / value objects | Unit tests for invariants and edge cases |
| Application service | Integration test: success + failure + boundary (no cross-module write) |
| Prisma schema change | Migration check (`prisma migrate` dry-run or apply on disposable DB), repository test, rollback note |
| New/changed endpoint | API-contract test: valid input, invalid input, authorization, restricted-fact redaction |
| `packages/contracts` change | Zod schema test: accepts valid, rejects invalid, rejects extra fields where relevant |
| Evidence/claim logic | Test: FACT claim without source rejected; UNKNOWN claim with price rejected |
| Research-context assembly | Test: SUPERSEDED absent; PENDING/RESTRICTED values redacted; `schemaVersion` present |

A task whose type is not listed must state its checks explicitly in
`tasks/current.md` before implementation.

---

## 3. Fixtures

- Fixtures live alongside the test (or under a package-local `test/fixtures`).
- Fixtures must be **deterministic** and contain **no real personal data and no
  production credentials**.
- Database fixtures are inserted through typed repositories/services only —
  never raw SQL outside the database package's seeding utilities.
- A fixture for a "valid source" and a "claim with/without source" must exist
  for the `evidence` module (see `contracts/research-context.v1.md` §12 and the
  historical harness in `../legacy/docs/market-research-harness.md` §9).

---

## 4. Database Integration Tests and Readiness

- Database-package tests run against a **disposable, isolated** PostgreSQL
  database (`ai_sdr_test` on the local Docker Compose service). They must never
  write to the normal development database (`ai_sdr`).
- The test `globalSetup` creates the test database if missing and applies the
  migration chain (`prisma migrate deploy`); each test truncates all domain
  tables so no data leaks between tests.
- The API `GET /ready` success path is tested against the **real** local
  PostgreSQL service (a real Prisma client + driver adapter, not a mock). The
  failure path points at an unreachable address and asserts a non-sensitive
  503 with no connection string, stack trace, or database error in the body.
- These integration tests require the Docker Compose database to be running
  (`pnpm db:up`). `GET /health` remains a liveness check and requires no DB.

## 5. Hard Prohibitions in Tests

- **No real external search**, scraping, or live web calls.
- **No email delivery** (and no IMAP/SMTP outbound).
- **No production credentials** (use `.env.test` / injected config only).
- No network access except to a local, disposable Postgres started by the
  Docker Compose harness.
- Tests must not write to `../legacy/**`.

## 6. Done Criteria (recorded evidence)

A task **cannot** be marked DONE unless `tasks/done/...` records:

1. the exact commands run (with their results/exit codes);
2. the test results (pass/fail counts) or an explicit "no tests applicable"
   statement with justification;
3. the migration applied, or "migration not needed";
4. the endpoints/contracts added or changed;
5. known limitations.

If verification fails or a check is unavailable, the task is **blocked**, not
DONE.
