# AI SDR Assistant — Admin Web

Administrative UI for the AI SDR Assistant. This is the first vertical slice of
the admin interface: a dashboard shell plus the **Products** module.

> **API connection:** the full Products workflow is live against the internal
> API — list (`GET /products`), create (`POST /products`), open
> (`GET /products/:id`), and edit (`PATCH /products/:id`). Deferred items are
> listed in [`docs/MISSING_API.md`](./docs/MISSING_API.md).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- Tailwind CSS v4 with shadcn-style primitives in `components/ui`
- React Hook Form + Zod for form state and validation
- Server Components by default; Client Components only for interaction
- A small server-only typed API layer in `lib/api` (the internal API key never
  reaches the browser)
- Vitest for pure-logic unit tests

## Routes

| Route | Description |
|---|---|
| `/` | Dashboard overview (placeholder metrics, clearly marked) |
| `/products` | Products list (live `GET /products`) |
| `/products/new` | New product form (live `POST /products`) |
| `/products/[id]` | Product detail + edit (live `GET` / `PATCH`) |

## Getting started

```bash
# from soft/
cp apps/web/.env.example apps/web/.env.local   # set INTERNAL_API_KEY
pnpm dev:web
```

Then open http://localhost:3000. The API must be running (default
`http://localhost:3003`) with the same `INTERNAL_API_KEY`. Without a key, the
screens show an explicit "not configured" notice instead of failing opaquely.

## Domain alignment

- Product lifecycle is `DRAFT | ACTIVE | ARCHIVED`, derived from
  `ProductLifecycleStatusSchema` in `@ai-sdr/contracts`. There is no `PAUSED`.
- Create and update validate against the shared `CreateProductSchema` /
  `UpdateProductSchema`; the update action also clears blank nullable fields.
- Research state is run-scoped (`ResearchRun`); there is **no** product-level
  research status in the domain and the UI does not invent one.
- Specifications are `ProductFact` records and are not part of these forms;
  fact authoring is deferred pending a read path (see `docs/MISSING_API.md`).

## Commands

```bash
pnpm --filter web lint
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter web build
```

### Contracts packaging note

`@ai-sdr/contracts` exports only its built `dist` (its source uses NodeNext
`.js` import specifiers that Turbopack does not rewrite to `.ts`). The web app
therefore consumes the package's build output; run `pnpm --filter
@ai-sdr/contracts build` once before a standalone `web` build, or use the root
`pnpm build`, which builds `packages/contracts` first via dependency order.

## Source layout

```text
app/
  (dashboard)/            # dashboard shell route group
    layout.tsx            # sidebar + content shell
    page.tsx              # dashboard home
    products/…            # list, new, [id]
components/
  dashboard/              # shell, sidebar, page header, stat cards
  products/               # table, status badge, form, notices
  ui/                     # shadcn-style primitives
lib/
  api/                    # server-only API client, product calls, Server Actions
  products/               # contract adapter, lifecycle status, payload builders, mappers
  env.ts                  # API base URL + internal key
```
