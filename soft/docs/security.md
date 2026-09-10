# Security

**Status:** Live policy.
**Companion:** `AGENTS.md`, `architecture.md`, `contracts/research-context.v1.md`, `testing.md`.

This document defines the security rules the system and the coding agent must
obey.

---

## 1. Environment and Secrets

- Secrets live in environment variables, never in source, fixtures, or the DB.
- `.env` files are git-ignored (see `.gitignore`). A committed `.env` is a
  violation.
- Secrets are loaded through the app's configuration service; they are never
  logged, echoed, or embedded in error messages.
- The API host validates only `NODE_ENV` and `PORT`; it reads `DATABASE_URL`
  (a connection string, treated as a secret) from the environment and never
  logs, echoes, or embeds it in error messages. Application logs are
  structured (pino) and must never emit secrets or restricted values.
- For local development/runtime the API loads the workspace root `.env` at
  startup (`process.loadEnvFile`, missing file is a no-op). Real environment
  variables always take precedence over `.env` (dotenv/Node semantics), and no
  loaded value is logged or echoed.
- Docker Compose uses env substitution for DB credentials; the local dev
  credentials are for local development only.

## 2. Data Minimisation and Source Provenance

- Store only what is needed for legitimate B2B sales activity.
- Every piece of company/contact/claim data records **where it came from**
  (`evidence` module: `source_references` with retrieval date and type).
- No sensitive personal data (special categories under GDPR) in the system.
- "Publicly available" does not mean "unrestricted for any use."

## 3. Logging, Fixtures, and Commits

- No credentials, tokens, or personal data in logs, fixtures, or commit
  messages.
- Redact credential and restricted values in all output (see
  `contracts/research-context.v1.md` §6 — restricted facts are redacted).
- Error messages must never echo secrets.

## 4. Outreach

- Outreach **remains human-approved at all times**. The system drafts; it never
  sends without an explicit, logged approval (`approvals` module).
- No auto-send, no auto follow-up, no reply analysis that triggers sending.

## 5. Access Rules for Restricted Facts

- RESTRICTED facts are redacted (`value: null`) in the research context on both
  the DI and REST paths, regardless of caller role.
- Elevated roles may see restricted values only through a separate admin read
  model — never through the research-context contract.
- A module may read only the tables it declares in `data-ownership.md` /
  `module-boundaries.md`; cross-module reads go through the owning service.

## 6. Retention and Deletion

- Retention and deletion decisions must be **explicit** and recorded as a
  decision in `docs/decisions.md` (or a decision record) — never implicit.
- Fact and knowledge entities use archive/restore or append-only versioning;
  hard deletion is not exposed where history is referenced.
- Deletion of personal/contact data must be reproducible and auditable.

## 7. Agent-Side Rules (binding)

- Never commit secrets, `.env`, or fixtures containing real data.
- Never bypass the approval gate.
- Never write restricted values into outputs, logs, or drafts.
- Never introduce a raw DB write outside typed repositories/services.

## 8. Internal Service-to-Service API Key

The business endpoints (product/offer/fact/target-market/opportunity creation and
the research-context read) are protected by a small **internal API-key guard**.
This is not end-user authentication: there are no users, roles, sessions, JWTs,
or admin UI.

- The key is read from `INTERNAL_API_KEY` (env). It is never logged, echoed, or
  returned, and never appears in an error body.
- Callers send it in the `x-internal-api-key` header. Comparison is
  constant-time.
- If `INTERNAL_API_KEY` is unset or too short, the guard **fails closed** (503)
  for business endpoints.
- A missing or wrong key returns a non-sensitive 401 body (`{"error":"unauthorized"}`).
- `GET /health` and `GET /ready` remain public (liveness/readiness).
- Tests never assert the secret value itself; they assert status codes and that
  responses do not leak `DATABASE_URL` or `INTERNAL_API_KEY`.
