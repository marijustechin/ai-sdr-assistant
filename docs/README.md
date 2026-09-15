# Documentation

This repository has **one canonical documentation set** and clearly bounded
historical and implementation sets. When documents disagree, the canonical set
wins; historical material never overrides it.

---

## Hierarchy and boundaries

| Location | Status | Owns | Must not |
|---|---|---|---|
| root `AGENTS.md` | **Binding** | Manager operating contract (direction, coordination, decisions, intake, delegation, project state) | Implementation details |
| `docs/system/` | **Canonical (live)** | System/business architecture, module map, data governance, research-context contract, decisions, project state | Application code, test mechanics |
| `docs/system/decisions.md` | **Canonical (live)** | Recorded consequential decisions + rationale | Superseded proposals |
| `docs/system/research-toolchain.md` | **Canonical (live)** | Manager research toolchain: installed tools, auth, selection rules, limits | Live business state, provider secrets |
| `docs/benchmarks/` | **NON-CANONICAL — capability evidence** | Dated, explicitly labelled capability-test records | Authority; live business state |
| `soft/AGENTS.md` | **Binding (implementation)** | Implementation contract (toolchain, code invariants, testing, schema) | Manager-level direction |
| `soft/docs/` | **Implementation (live)** | Software implementation, testing, security, coding harness, data model, implementation contracts | Duplicating canonical system docs; editing the schema |
| `soft/tasks/` | **Programmer task loop** | One active implementation task + archives | Manager direction |
| `ops/` | **Manager task loop** | One active manager task + archives | Application code |
| `docs/redesign/` | **HISTORICAL — SUPERSEDED** | Preserved proposal history | Authority over current design |
| `legacy/` | **HISTORICAL — NON-LIVE** | Importable evidence (products, research, prior plans) | Authority; being edited |

### Canonical vs. implementation (do not duplicate)

- **Root `docs/system/` is the canonical source** for system/business
  architecture and contracts (including the Research Context contract).
- **`soft/docs/` is the implementation source** for how the software is built,
  tested, secured, and verified. It **links to** the canonical root docs rather
  than restating whole contracts.
- Business tables and their live values are **never** documented as Markdown
  state. PostgreSQL (via `soft/packages/database`) is the single live store.

---

## `docs/redesign/` is superseded

`docs/redesign/` is **historical, superseded proposal material** from the
2026-09-09 redesign. It is retained for rationale and traceability only and is
**not current architecture**. In particular it predates the implemented reality
and therefore still contains the following, which are **no longer authoritative**:

- Bun workspaces / `bun` lockfiles (the workspace is **Node 24 + pnpm 11**);
- a root `modules/` workspace (feature modules live in
  `soft/apps/api/src/modules/<module>`);
- a root `workers/` directory (the future worker is `soft/apps/worker`);
- a `repository.base.ts` abstraction (removed — direct Prisma boundary);
- `RESTRICTED` as a product-fact *status* (implemented as a separate
  `visibility` dimension).

The canonical, reconciled versions of every redesign topic live in
`docs/system/`. Use `docs/system/`, not `docs/redesign/`, for current work.

---

## Reading order

1. root `AGENTS.md` — how work is governed.
2. `docs/system/project-state.md` — what exists, what does not, what is blocked.
3. `docs/system/architecture.md` — canonical architecture.
4. `docs/system/module-map.md` — modules, boundaries, ownership.
5. `docs/system/data-governance.md` — tables, owners, write rules.
6. `docs/system/research-context-contract.md` — the cross-module contract.
7. `docs/system/decisions.md` — recorded decisions.
8. `docs/system/research-toolchain.md` — manager research toolchain operating context.
9. `soft/docs/` — implementation, testing, security, harness details.
