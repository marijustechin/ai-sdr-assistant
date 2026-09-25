# `soft/legacy/` — HISTORICAL, NON-LIVE

This directory preserves the **pre-rebuild API scaffold** as historical input.
It is **not** built, imported, tested, or part of the workspace (it is excluded
from the pnpm workspace and from the verification source scan).

- Never authoritative: the current implementation lives in `../apps/` and
  `../packages/`; the canonical description is `../../docs/system/`.
- Never modified to fix behaviour; keep it as-is for traceability.
- Its sibling `../../legacy/` holds the repository-root historical material.

The presence of `api-scaffold-2026-09-09/` is asserted by `../scripts/verify.sh`
so it cannot silently be deleted or mistaken for live code.
