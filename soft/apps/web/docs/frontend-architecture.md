# Frontend architecture (FSD-light) — rules and migration state

Status: **transitional**. This documents the pragmatic Feature-Sliced-Design
(FSD-light) layering for the admin web app and the state of the migration. It is
implementation guidance, not a strict textbook FSD contract.

## Layers

```text
app  →  widgets  →  features  →  entities  →  shared
```

Only layers a slice actually needs; no empty layers, no forced nesting.

- **`app/`** — Next.js App Router routing and page composition only. Pages fetch
  through entity read APIs and render widgets/features. Route paths are stable.
- **`shared/`** — cross-cutting kernel with no domain knowledge:
  `shared/api` (internal API client + error mapping, `server-only`),
  `shared/config` (`env`, `server-only`), `shared/lib` (utils/`cn`, `format`,
  `nav`, `branding`), `shared/ui` (design-system components — currently still at
  `components/ui`, treated as shared by role).
- **`entities/`** — a domain's read model and read-only UI: `types.ts`
  (wire/read types), `display.ts` (derivations/labels), `api.ts` (server-only
  reads), `ui/` (read-only components), `index.ts` (client-safe public API).
- **`features/`** — a user action that writes: the form, its payload builder,
  `api.ts` (server-only writes) and `actions.ts` (`"use server"`).
- **`widgets/`** — cross-entity composed blocks (reserved; not yet introduced
  beyond the existing `components/dashboard` shell).

## Dependency rules

1. `app` may import `widgets`/`features`/`entities`/`shared`.
2. `widgets` may import `features`/`entities`/`shared`.
3. `features` may import `entities`/`shared` (avoid feature→feature).
4. `entities` may import `shared` only (cross-entity reads via the other slice's
   read API, kept acyclic; never another entity's UI).
5. `shared` imports nothing app-specific.
6. No slice imports `app/*` (ESLint `no-restricted-imports`).
7. Cross-slice imports use the alias barrels (`@shared/*`, `@entities/*`,
   `@features/*`, `@widgets/*`); inside a slice use relative imports.

## Runtime-directive rules (must not change during moves)

- `shared/api/client.ts`, `shared/config/env.ts`, every `entities/*/api.ts`, and
  every `features/*/api.ts` → `import "server-only"`.
- `features/*/actions.ts` → file-scope `"use server"` (all exports async).
- `features/*/form.tsx` and client widgets → `"use client"`.
- A client module must never import `shared/api/*`, `shared/config/*`, or
  `entities/*/api`.

## Public API convention

- `entities/<x>/index.ts` is **client-safe** (types + display + read-only UI). It
  must not re-export the server-only `api.ts`.
- Server reads use the explicit segment: `@entities/<x>/api`.
- `features/<x>/index.ts` exposes the form; payload/write API/actions stay
  internal to the slice.

## Tooling

- Aliases (`tsconfig.json` + `vitest.config.ts`): `@shared/*`, `@entities/*`,
  `@features/*`, `@widgets/*` (plus the existing `@/*`).
- Vitest collects `lib/`, `components/` **and** `shared/`, `entities/`,
  `features/`, `widgets/` while the migration is in flight.
- `shared/api/boundary.test.ts` encodes the server/client rules and the layer
  import directions. ESLint adds `no-restricted-imports` for `@/app`.

## Migration state (2026-09-22)

Done:

- **Kernel** → `shared/` (`lib/{utils,format,nav,branding,env}`, `lib/api/{client,errors}`,
  `boundary.test.ts`).
- **email-account** → `entities/email-account` + `features/manage-email-account`.
- **sender-profile** → `entities/sender-profile` + `features/manage-sender-profile`.
- **outreach-draft** → `entities/outreach-draft` (no write feature exists).

Deliberately left in `lib/` + `components/` for later phases (unchanged here):

- **product** — `lib/products`, `lib/api/products.ts`, `lib/api/actions.ts`,
  `components/products/*`, `app/(dashboard)/products/**`.
- **research** — `lib/research`, `lib/research-requests`,
  `lib/api/{research,research-requests}.ts`, `components/research/*`.
- **lead** — `lib/leads`, `lib/api/{leads,leads-actions}.ts`, `components/leads/*`
  (leads only; contacts/drafts are separate concerns).
- **contact** — `lib/contacts`, `lib/api/{contacts,contacts-actions}.ts`,
  contact UI still colocated under `components/leads/`.
- **dashboard metrics** — `lib/dashboard`, `lib/api/dashboard.ts`,
  `components/dashboard/stat-card.tsx`.

Transitional notes:

- `components/ui` remains the shared design system by role; it can move to
  `shared/ui` in a later cosmetic phase without behavior change.
- `lib/api/actions.ts` (generic) still mixes product + research-request actions;
  split when product/research migrate.
- No transitional re-export shims were introduced: kernel consumers were updated
  directly.

## Next phases

1. Migrate remaining entities/features one slice at a time (product, then
   research, then lead/contact).
2. Introduce `widgets/` for `app-shell`, `dashboard-summary`, `lead-workspace`,
   `research-run-view`, `product-section-nav`.
3. Thin `app/` to composition and finalize boundary enforcement.
