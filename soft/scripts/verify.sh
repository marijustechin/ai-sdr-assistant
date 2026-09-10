#!/usr/bin/env bash
#
# verify.sh — fail-fast structural + safety checks for the pnpm workspace.
#
# Mandatory checks (failure => non-zero exit): required structure, correct
# lockfile (pnpm-lock.yaml present, bun.lock absent), single Prisma schema owner,
# expected business modules present, legacy scaffold archived, toolchain pinned
# to Node 24 + pnpm 11, no committed secrets.
#
# Usage: bash scripts/verify.sh  (or: pnpm verify)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
INFO=0

ok()   { printf 'PASS  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf 'FAIL  %s\n' "$1"; FAIL=$((FAIL+1)); }
info() { printf 'INFO  %s\n' "$1"; INFO=$((INFO+1)); }

# --- 1. Required structure (mandatory) --------------------------------------

required_files=(
  AGENTS.md
  README.md
  package.json
  pnpm-workspace.yaml
  .nvmrc
  pnpm-lock.yaml
  docker-compose.yml
  .env.example
  docs/architecture.md
  docs/module-boundaries.md
  docs/data-ownership.md
  docs/data-model.md
  docs/task-execution.md
  docs/testing.md
  docs/security.md
  docs/decisions.md
  docs/harness.md
  docs/task-format.md
  docs/contracts/research-context.v1.md
  packages/database/prisma/schema.prisma
  packages/database/src/prisma.service.ts
  packages/database/src/index.ts
  packages/contracts/package.json
  packages/contracts/src/index.ts
  apps/api/src/modules/products-and-offers/products-and-offers.module.ts
  apps/api/src/modules/opportunities/opportunities.module.ts
  apps/api/src/modules/control-plane/control-plane.module.ts
  harness/task-template.md
  harness/acceptance-checklist.md
  scripts/verify.sh
  tasks/backlog.md
  tasks/current.md
)

required_dirs=(
  apps
  apps/api
  apps/web
  packages
  packages/database
  packages/database/prisma/migrations
  packages/contracts
  docs
  docs/contracts
  harness
  scripts
  tasks
  tasks/done
)

for f in "${required_files[@]}"; do
  if [[ -f "$f" ]]; then ok "file present: $f"; else bad "missing file: $f"; fi
done

for d in "${required_dirs[@]}"; do
  if [[ -d "$d" ]]; then ok "dir present: $d"; else bad "missing dir: $d"; fi
done

# --- 2. Lockfile / toolchain layout (mandatory) ------------------------------

if [[ -e bun.lock ]]; then
  bad "bun.lock present (should be removed)"
else
  ok "bun.lock absent"
fi

if [[ -f pnpm-lock.yaml ]]; then
  ok "pnpm-lock.yaml present"
else
  bad "pnpm-lock.yaml missing"
fi

# --- 3. Single schema/migration owner + no business modules (mandatory) ------

if [[ -e packages/database/prisma/schema.prisma ]]; then
  ok "packages/database/prisma/schema.prisma present (single schema owner)"
else
  bad "missing packages/database/prisma/schema.prisma"
fi

if [[ -d packages/database/prisma/migrations ]] \
   && find packages/database/prisma/migrations -name 'migration.sql' | grep -q .; then
  ok "packages/database migrations present"
else
  bad "missing packages/database/prisma/migrations"
fi

if find packages -type d -name migrations \
   -not -path 'packages/database/*' 2>/dev/null | grep -q .; then
  bad "migration directories found outside packages/database"
else
  ok "no migrations outside packages/database"
fi

if [[ -d modules ]]; then
  bad "unexpected: modules/ exists (no root modules workspace)"
else
  ok "no modules/ directory"
fi

if [[ -e apps/api/prisma/schema.prisma ]]; then
  bad "unexpected: apps/api/prisma/schema.prisma exists (schema must live in packages/database)"
else
  ok "no apps/api Prisma schema"
fi

if find apps/api -type f -path '*generated*' -name 'client.ts' 2>/dev/null | grep -q .; then
  bad "unexpected: generated Prisma client under apps/api"
else
  ok "no generated Prisma client under apps/api"
fi

if [[ -d apps/api/src/modules/products-and-offers \
   && -d apps/api/src/modules/opportunities \
   && -d apps/api/src/modules/control-plane ]]; then
  ok "business modules present under apps/api/src/modules"
else
  bad "missing expected business modules under apps/api/src/modules"
fi

if find packages -type f -name 'schema.prisma' \
   -not -path 'packages/database/*' 2>/dev/null | grep -q .; then
  bad "Prisma schema found outside packages/database"
else
  ok "single Prisma schema owner (packages/database)"
fi

# --- 4. Legacy scaffold archived (mandatory) ---------------------------------

if [[ -d legacy/api-scaffold-2026-09-09 ]]; then
  ok "legacy/api-scaffold-2026-09-09 archived"
else
  bad "legacy/api-scaffold-2026-09-09 missing (old scaffold must be archived)"
fi

# --- 5. Toolchain pinned to Node 24 + pnpm 11 (mandatory) --------------------

if command -v node >/dev/null 2>&1; then
  NODE_V="$(node --version 2>/dev/null || echo unknown)"
  if [[ "$NODE_V" == v24.* ]]; then
    ok "node version $NODE_V (Node 24 LTS)"
  else
    bad "node version $NODE_V (expected Node 24.x; see .nvmrc)"
  fi
else
  bad "node not installed"
fi

if command -v pnpm >/dev/null 2>&1; then
  PNPM_V="$(pnpm --version 2>/dev/null || echo unknown)"
  if [[ "$PNPM_V" == 11.* ]]; then
    ok "pnpm version $PNPM_V (pnpm 11)"
  else
    bad "pnpm version $PNPM_V (expected pnpm 11.x)"
  fi
else
  bad "pnpm not installed"
fi

# --- 6. No secrets / credentials in tracked source (mandatory) ---------------

SECRET_SCAN_DIRS='--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git --exclude-dir=legacy --exclude-dir=.next'
PRIVKEY_PAT='BEGIN (RSA|OPENSSH|EC|PRIVATE) PRIVATE KEY'

if grep -rInE "$PRIVKEY_PAT" \
     --include='*.ts' --include='*.js' --include='*.json' --include='*.yml' \
     --include='*.yaml' --include='*.md' \
     $SECRET_SCAN_DIRS --exclude='*.env' --exclude='*.env.*' \
     --exclude-dir='generated' . 2>/dev/null | grep -q .; then
  bad "private key material detected in source files"
else
  ok "no private key material in source files"
fi

# Literal-looking secret values (avoids `${VAR}` placeholders).
# README.md files are excluded: stock starter READMEs contain a non-secret
# example token in a CircleCI badge URL.
if grep -rInE '(secret|token|api[_-]?key|password)[[:space:]]*[:=][[:space:]]*["'"'"']?[A-Za-z0-9+/=_-]{12,}' \
     --include='*.ts' --include='*.js' --include='*.json' --include='*.yml' \
     --include='*.yaml' --include='*.md' \
     $SECRET_SCAN_DIRS --exclude='*.env' --exclude='*.env.*' \
     --exclude-dir='generated' --exclude='README.md' . 2>/dev/null | grep -q .; then
  bad "literal-looking secret value detected in source files"
else
  ok "no literal-looking secret values in source files"
fi

# --- Summary -----------------------------------------------------------------

echo
echo "verify.sh summary: $PASS passed, $FAIL failed, $INFO informational"

if [[ "$FAIL" -gt 0 ]]; then
  echo "FAILURE: $FAIL mandatory check(s) failed."
  exit 1
fi

echo "OK: mandatory structural and safety checks passed."
exit 0
