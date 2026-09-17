# O-015 — Replace standalone Node with nvm-windows on Windows

**Status:** READY_FOR_HUMAN_REVIEW
**Type:** coordination (environment/process)
**Scope:** local Windows Node/pnpm toolchain; documentation. No application,
dependency, database, commit or push changes.

## Objective

Make a fresh PowerShell window run the project's required Node (`soft/.nvmrc`,
24.20.0) and `pnpm.cmd dev:api` with no "Unsupported engine" warning and no
temporary PATH overrides, by replacing the standalone winget Node with
nvm-windows. Preserve user configuration/credentials and the installed global
tool (pnpm 11.26.0). Keep engines unchanged.

## Inputs / references

- `AGENTS.md` §2, §6 (Node activation); `soft/AGENTS.md` §2
- `soft/.nvmrc` (24.20.0); `soft/package.json` engines/pnpm
- `docs/system/research-toolchain.md` §4 (Windows reproduction)

## Inventory (inspected)

- Standalone Node: winget `OpenJS.NodeJS.22` v24.19.0, machine MSI
  (`MsiExec.exe /I{89850E15-F7D6-476D-972E-F8F5215E4498}`), `C:\Program Files\nodejs`.
- Global npm tools: only `pnpm@11.26.0` (at `%APPDATA%\npm`); corepack 0.35.0.
- PATH (filtered): `C:\Program Files\nodejs\` and `%APPDATA%\npm`.
- No nvm installed; `%NVM_HOME%`/`%NVM_SYMLINK%` unset; Developer Mode off; UAC on;
  shell is a filtered admin token (UAC consent needed).
- Installer staged: `%LOCALAPPDATA%\Temp\opencode\nvm-setup-1.2.2.exe`.

## Steps

1. Prepare the nvm-windows installer and recovery instructions before uninstall.
2. Uninstall the standalone Node via its installer/winget (UAC), clean obsolete PATH.
3. Install nvm-windows; `nvm install 24.20.0`; `nvm use 24.20.0`; corepack pnpm 11.26.0.
4. Verify in a fresh shell; update Windows setup docs.

## Acceptance criteria

- [ ] Fresh PowerShell: `node -v` = v24.20.0; `npm`/`npx`/`pnpm.cmd` available.
- [ ] `verify.sh` passes; `pnpm.cmd dev:api` + `/health` + `/ready` OK.
- [ ] No Unsupported engine warning; no temporary PATH overrides.
- [ ] pnpm 11.26.0 restored; user config/credentials preserved.
- [ ] Windows setup docs updated; no commit/push.

## Rollback / blocked conditions

- Recovery: `winget install --id OpenJS.NodeJS.22 --version 24.19.0` (elevated), or
  the Node 24.x MSI. Blocked if UAC cannot be confirmed or a running Node process
  locks `C:\Program Files\nodejs`; record the blocker, do not half-migrate.

## Completion record

**Status:** BLOCKED — not completed, not archived. The live swap cannot be
performed from inside this OpenCode session without either elevation (UAC) or
terminating OpenCode's own MCP children, both of which are out of bounds.

1. **Inspection (done).** Standalone Node = winget `OpenJS.NodeJS.22` v24.19.0,
   machine MSI `{89850E15-F7D6-476D-972E-F8F5215E4498}`, `C:\Program Files\nodejs`.
   `C:\Program Files\nodejs\` is on the **Machine** PATH; `%APPDATA%\npm` on the
   **User** PATH. Only global npm tool: `pnpm@11.26.0` (corepack 0.35.0 present).
   No nvm installed; Developer Mode off; UAC on; the shell is a **filtered
   (medium-integrity) admin token** (intended UAC state); UAC on = 1.
2. **Blocker.** `C:\Program Files\nodejs\node.exe` is **locked** and in use by
   **four OpenCode Gemini-MCP children** (PIDs 9260, 11544, 14360, 16568) running
   from that node. The MSI uninstall cannot remove the binary while they run, and
   the agent must not terminate OpenCode/MCP children. Both the uninstall and the
   nvm-windows installer also require **UAC** (machine MSI + machine PATH). The
   agent cannot quit its own host, so a correct, non-destructive swap is not
   possible in-session.
3. **Prepared (not executed).** Official installer staged:
   `%LOCALAPPDATA%\Temp\opencode\nvm-setup-1.2.2.exe` — 5,612,296 bytes, SHA-256
   `2D5AD523AA6182205DA77C0EB8210638AAA8792F4E6A4BC12E1AC854C5455A68`.
   Recovery: `winget install --id OpenJS.NodeJS.22 --version 24.19.0
   --accept-package-agreements --accept-source-agreements` (elevated).
4. **Manual procedure (actual working steps, added to docs).** Exact commands are
   in `docs/system/research-toolchain.md` §4.0 (admin PowerShell with OpenCode
   quit): `winget uninstall --id OpenJS.NodeJS.22` → run `nvm-setup-1.2.2.exe /S`
   → new shell `nvm install 24.20.0` / `nvm use 24.20.0` → `corepack enable` /
   `corepack prepare pnpm@11.26.0 --activate` → remove the obsolete user PATH
   entry `%APPDATA%\npm` → restart OpenCode.
5. **Verified now (baseline).** `.nvmrc` = `24.20.0`; `engines` =
   `{node: >=24.20.0 <25, pnpm: >=11.26.0 <12}`; `packageManager` =
   `pnpm@11.26.0`; `npx --version` works (11.17.0, MCP path). Current host node is
   **v24.19.0**, so the repository Node gate fails under it (observed previously) —
   exactly what the migration fixes.
6. **Docs updated.** `docs/system/research-toolchain.md` §4.0 (new),
   `soft/README.md` Toolchain, root `AGENTS.md` §2, `soft/AGENTS.md` §2 corrected
   to the nvm-windows activation pattern.
7. **Not done / untouched.** No uninstall, no install, no PATH change, no process
   termination; machine left in its current working state (no half-migration).
   No application, dependency, database, commit or push changes.

## Resume & verification record (2026-09-17, after manual migration)

**Status:** READY_FOR_HUMAN_REVIEW. The human completed the manual migration
(nvm-windows 1.2.2, Node 24.20.0, pnpm 11.26.0). Verified in fresh shells with
**no temporary PATH overrides**:

1. **Resolution.** `node -v` = **v24.20.0** (`process.execPath` =
   `C:\nvm4w\nodejs\node.exe`); `npm`/`npx` = 11.19.0; `pnpm.cmd` = **11.26.0**;
   `where.exe node|npm|npx|pnpm` all resolve under `C:\nvm4w\nodejs`;
   `nvm version` = 1.2.2, `nvm root` = `C:\Users\msmig\AppData\Local\nvm`, and
   24.20.0 is the selected version. PATH carries `%NVM_HOME%`/`%NVM_SYMLINK%`;
   the previous staged Node is **not** on PATH.
2. **Repository verification.** `bash scripts/verify.sh` → **60 passed / 0
   failed**, including `PASS node version v24.20.0 (satisfies '>=24.20.0 <25'
   from package.json engines)` and `PASS pnpm version 11.26.0 (pnpm 11)`.
   `pnpm --dir soft run db:migrate:status` → "Database schema is up to date!"
   with **no Unsupported engine warning**.
3. **API.** Reused the running `dev:api` (PID 21564), which resolves to
   `C:\nvm4w\nodejs\node.exe`; `GET /health` → `{"status":"ok"}` and
   `GET /ready` → `{"status":"ready"}`. Docker/PostgreSQL was restarted after the
   machine restart (established procedure); no ports changed and no unrelated
   processes were stopped.
4. **npx** is available (11.19.0) for the configured MCP tools.
5. **Docs** updated to the actual installation (paths/versions) in
   `docs/system/research-toolchain.md` §4.0 and `soft/README.md`.
6. **Acceptance met** (criteria 1–5): a fresh shell runs the required Node and
   pnpm with no engine warning and no PATH overrides; engines unchanged; real
   database/business records untouched; no application, dependency, database,
   commit or push changes.

## Closure — O-015 approved (2026-09-17)

**Status:** CLOSED / ACCEPTED. The human approved O-015. The Windows runtime is
now **nvm-windows 1.2.2** with **Node 24.20.0** selected (`C:\nvm4w\nodejs`) and
**pnpm 11.26.0** via corepack; the standalone winget Node was removed and no
temporary PATH overrides remain. `verify.sh` **60/0** and `/health` + `/ready`
verified. The blocked history and the successful resume/verification record above
are preserved. No application, dependency, or database changes; the real research
run and business records are untouched.
