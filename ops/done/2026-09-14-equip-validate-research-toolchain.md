# O-007 — Equip and Validate the Market Research Toolchain

**Status:** CLOSED / ARCHIVED 2026-09-14
**Type:** direction
**Scope:** manager operating environment (OpenCode configuration, MCP integrations,
research toolchain documentation) + a dated, non-canonical research-coverage
capability test. No business records, no application code.

## Objective

Equip the manager workspace with a validated market-research toolchain — Exa
websearch, webfetch, a Gemini Google Search-grounding MCP, and the official
Firecrawl MCP — and prove its research coverage on a neutral public benchmark
(Thermo-Abachi / Thermo-Ayous hardwood cladding) across the UK, Germany and
France, using local-language queries. The toolchain and its limitations must be
documented as operating context; the benchmark output is a dated capability test
and must never become canonical live business state.

## Inputs / references

- `AGENTS.md` (§2 workspace, §3 live state vs Markdown, §6 delegation, §7 hard
  prohibitions)
- `docs/system/module-map.md` (§1 `control-plane`, §6 `research-records`, §7
  `market-researcher`, §8 `lead-discoverer`)
- `docs/system/project-state.md`
- `docs/system/data-governance.md`
- `docs/README.md`, `ops/README.md`, `ops/task-template.md`
- Human direction (this task): research capability and coverage are the immediate
  priority; product onboarding is postponed.
- Prior capability test: the three-company UK Thermo-Ayous search (read-only,
  2026-09-14).

## Steps

1. Inspect the real environment (OS, shell, OpenCode version, config, providers,
   permissions, existing MCP) without altering providers or permissions.
2. Identify the exact maintained Gemini Google-Search-grounding MCP before
   installing it; record repository, install, auth, model support, and grounding
   mechanism.
3. Identify the official Firecrawl MCP; configure it following current official
   docs.
4. Configure both MCP integrations; never place secrets in tracked files.
5. Verify reachable tools with real calls where credentials/quotas permit;
   otherwise complete setup and record exact local steps.
6. Validate research coverage for UK/DE/FR with multiple local-language query
   families; compare Exa and the second engine on a shared subset; inspect
   company pages and accessible PDF catalogues; distinguish exact matches from
   substitutes.
7. Evaluate usefulness (unique relevant companies/pages, per-tool contribution,
   retrieval success/failure, supported price observations, new information,
   usage/cost).
8. Document the toolchain and reconcile stale README/project-state wording
   relevant to this task.
9. Leave the task at `READY_FOR_HUMAN_REVIEW`.

## Deliverables

- `ops/current.md` — this task record.
- OpenCode MCP configuration for Firecrawl and Gemini Google Search (no secrets).
- `docs/system/research-toolchain.md` — operating context: installed tools,
  startup/auth instructions, tool-selection rules, retry limits, limitations.
- `docs/system/research-coverage-capability-test-2026-09-14.md` — dated,
  explicitly non-canonical benchmark evidence.
- Reconciled `README.md` / `docs/system/project-state.md` wording relevant to
  this task.
- `docs/system/decisions.md` — recorded decisions where consequential.

## Acceptance criteria

- [x] Environment reported accurately (OS, shell, OpenCode version, config,
      providers, permissions, MCP) and nothing existing is broken.
- [x] Gemini MCP is identified beyond a bare name, with repository, install,
      auth, model support and grounding mechanism recorded.
- [x] Official Firecrawl MCP configured per current official documentation, with
      real `firecrawl_search` and `firecrawl_scrape` calls verified.
- [x] No secret is requested in chat or written into a tracked file.
- [x] Real tool calls attempted; every failure, blocked URL and unresolved
      question recorded; unvisited candidates marked NOT_EVALUATED.
- [x] Exa and a second engine compared on a shared query subset; the Gemini
      comparison's impossibility is recorded (no credential).
- [x] Benchmark evidence is dated and labelled a capability test, and is not
      canonical live business state.
- [x] README/project-state stale wording relevant to this task reconciled.
- [x] Task left at `READY_FOR_HUMAN_REVIEW`; no commit or push.
- [x] Continuation pass executed: Firecrawl verified **in-session**; Gemini
      connection failure and the absent key documented, with installation,
      connection, execution and coverage distinguished and not overstated.

## Out of scope

- Creating or changing any database/business record; product onboarding.
- Implementing any `soft/**` module or creating a `soft/tasks/current.md` task.
- `legacy/**` and `docs/redesign/**`.
- Committing or pushing.
- Purchasing plans or enabling paid overages.

## Verification

- `opencode` config parses and existing providers/permissions are preserved.
- Firecrawl/Gemini MCP entries present with no embedded secrets.
- Real MCP tool calls (or documented non-reachability with exact remaining
  steps).
- `git status` shows only intended manager-workspace documentation changes.

## Rollback/blocked conditions

- Rollback: revert the OpenCode config addition and remove the two new
  `docs/system/` files; reset `ops/current.md` to the template. No live state,
  schema, or remote is affected.
- Blocked (do not archive): if the Gemini MCP proves unavailable without
  credentials and no credential-free path exists, record the blocker and the
  exact steps; the task still completes the remaining toolchain verification.

## Completion record

**Completed:** 2026-09-14 · **Status:** READY_FOR_HUMAN_REVIEW (not archived, no
commit, no push)

1. **Files created/changed**
   - created `docs/system/research-toolchain.md` (operating context)
   - created `docs/benchmarks/2026-09-14-research-coverage-capability-test.md`
     (dated, non-canonical capability evidence)
   - changed `docs/system/decisions.md` (O-007 decision)
   - changed `docs/system/project-state.md` (immediate-priority note + date)
   - changed `README.md` (stale current-state and contracts wording)
   - changed `docs/README.md` (register new canonical doc + benchmarks location)
   - changed global (untracked) `~/.config/opencode/opencode.jsonc` (MCP entries)
   - this `ops/current.md`
2. **Migrations applied:** not needed.
3. **Endpoints/contracts added or changed:** none.
4. **Commands run and results**
   - `opencode` not on PATH; identified running desktop install and version
     `1.18.30` from `~/.local/share/opencode/log/opencode.log`.
   - `node` `mcp-probe.mjs` (Firecrawl keyless): `initialize` OK
     (`firecrawl-fastmcp 3.24.1`), `tools/list` →
     `firecrawl_scrape, firecrawl_search, firecrawl_parse`; real
     `firecrawl_search("Thermo Ayous Fassade Holz Verkleidung")` returned German
     results, `creditsUsed: 2`.
   - `node` `gemini-stdio-probe.mjs` (`@houtini/gemini-mcp`): launched via
     `cmd /c npx`; startup log `API key validation failed` with a dummy key
     (confirms install + key requirement; no real grounded call possible).
   - `node` `firecrawl-bench.mjs` (6 shared queries) and `firecrawl-scrape.mjs`
     (Comptoir des Bois PDF + Gedimat) — results in the benchmark record.
   - `websearch` (Exa) on the same 6 queries; `webfetch` on Duffield, Housewood,
     E-Wood, plus Southgate/Premier/Vincent earlier.
   - `JSON.parse` of the global config → OK; servers `firecrawl, gemini`.
5. **Test/verification evidence:** Firecrawl keyless MCP verified with real
   search and PDF-scrape calls; Exa verified; Gemini package install verified but
   grounding **not** verified. Cross-engine retrieval of the same 6-query set,
   with candidates/status in the benchmark record.
6. **Known limitations / gaps**
   - Gemini grounding unverified — `GEMINI_API_KEY` absent at every scope, and
     the Gemini MCP connection failed in the restarted session (see continuation).
   - Germany thinly verified (NL retailers dominate German SERPs); France partly
     Belgian suppliers; many candidates NOT_EVALUATED.
   - Firecrawl keyless is search+scrape+parse only and cannot defeat every
     JS/paywall/consent wall (Gedimat case).
   - MCP servers load only at OpenCode launch; restart required to use them.
   - Exa/Firecrawl usage and cost not observable (reported unknown).
7. **Decisions made / blockers / next**
   - Decision recorded: research capability is the immediate priority; product
     onboarding postponed; manager toolchain chosen (Exa + webfetch + official
     Firecrawl keyless + `@houtini/gemini-mcp`).
   - Open human step: create an AI Studio key and set `GEMINI_API_KEY` (steps in
     `research-toolchain.md` §4), then restart OpenCode.
   - Next candidate slice is unchanged in project-state (`Knowledge + Approvals`),
     but research toolchain enablement should be confirmed first.
   - Pre-existing Git state unrelated to this task: `README.md` showed staged and
     unstaged content before O-007 (index held `loop...`, worktree `loop.`); not
     touched, not committed.

### Continuation — in-session MCP verification (2026-09-14, later)

A restarted session was used to verify the MCP servers from the inside. Status is
reported in four separate terms so nothing is overstated:

- **Installation** — Firecrawl endpoint and `@houtini/gemini-mcp` both installable.
- **Connection** — Firecrawl **connected in-session**; Gemini **FAILED**
  (`level=WARN message="server unavailable" key=gemini type=local status=failed`).
- **Successful tool execution** — Firecrawl `firecrawl_search` / `firecrawl_scrape`
  / `firecrawl_parse` executed in-session; Gemini **none**.
- **Research coverage** — Exa + Firecrawl extended; Gemini **none**.

Actions taken:

- `GEMINI_API_KEY` availability checked **without printing its value** at User
  scope, Machine scope, the process environment and in `cmd`: **absent
  everywhere**. The key the user believes is configured is not reaching OpenCode.
- Added `"timeout": 30000` to the `gemini` MCP entry (a cold `npx` start can
  exceed the default 5000 ms tool-fetch timeout).
- In-session Firecrawl calls: three shared-set `firecrawl_search` queries;
  `firecrawl_scrape` of gedimat.fr (first-pass ambiguous → **verified**, full
  price/spec); `firecrawl_scrape` PDF parse of the Comptoir des Bois fiche
  (2 pages; maker **LIGNALPES**); JSON extraction of benchmarktimber.co.uk after
  `webfetch` returned **HTTP 503** (→ verified); JSON extraction of
  holzhandelonline.de (DE Abachi/Thermo-Ayous → verified).
- The requested **Exa-vs-Gemini comparison remains not done** (Gemini never
  connected); the available **Exa-vs-Firecrawl** comparison is recorded in the
  benchmark §7.

Outstanding human action (blocker on full toolchain verification):

1. Create/reuse a Google AI Studio key.
2. `[Environment]::SetEnvironmentVariable("GEMINI_API_KEY","<key>","User")`.
3. Fully quit OpenCode and relaunch from a **new** Explorer/terminal window.
4. Request a Gemini grounded search and confirm returned source links.

### Continuation 2 — key present; connection OK; grounding blocked (2026-09-14, later)

- Windows identity: `alfasisdev\msmig`; `USERPROFILE=C:\Users\msmig`.
- `GEMINI_API_KEY`: **present** at User scope (length 39) and in the OpenCode
  process environment (length 39). Value never printed.
- Connection: **OK** — the Gemini MCP server (`gemini-mcp 2.6.2`) initializes and
  exposes 13 tools; `gemini_list_models` executed successfully (real tool call,
  `isError=false`).
- Grounded search: **FAILED** — `gemini_chat` returns
  `HTTP 429 RESOURCE_EXHAUSTED` ("exceeded your current quota… check your plan
  and billing details") for every current model tried. The previously pinned
  `gemini-2.5-flash` is retired for new users (404); the config now pins
  `gemini-3.1-flash-lite`.
- The URLs in the 429 payload are Google's error-help links, **not** search
  grounding sources; no grounded answer was produced.
- Config inspected: `cmd /c npx -y @houtini/gemini-mcp`, `timeout: 30000`,
  `{env:GEMINI_API_KEY}`, grounding default true — structure is correct. Root
  cause is **quota/billing**, not configuration, key format or connectivity.
- Bounded retries respected; the broader benchmark was **not** repeated.

Status: installation + connection + one auxiliary tool execution verified;
**grounded search and research coverage remain NOT verified**. Human action:
attach API quota/billing to the Google project (free-tier quota appears
unavailable for the current models), then request a grounded search. Until then
the toolchain is **not fully verified**. No commit or push was made; the
pre-existing staged/unstaged `README.md` state was left untouched.

### Continuation 3 — quota-blocker diagnosis (2026-09-14, later)

Direct official Gemini API (`generativelanguage.googleapis.com/v1beta/
models/gemini-3.1-flash-lite:generateContent`, existing environment key, no
project context, no model cycling):

| Request | Tools | Result |
|---|---|---|
| REQ1 minimal text generation (`"ping"`) | none (Google Search **disabled**) | **HTTP 200** — text `pong`, `finishReason=STOP`, `usageMetadata{promptTokenCount:1, candidatesTokenCount:1, totalTokenCount:2, serviceTier:"standard"}` |
| REQ2 small grounded query (`"What is the capital of France?"`) | `[{ google_search: {} }]` | **HTTP 429 RESOURCE_EXHAUSTED** |

Structured error fields (sanitized; credentials never printed):

- `error.status = RESOURCE_EXHAUSTED`, `error.code = 429`.
- `error.details = [ { "@type": "type.googleapis.com/google.rpc.Help" } ]` only.
- `quotaMetric`, `quotaId`, `quotaDimensions`, `quotaValue`, `retryDelay`:
  **not present** in the response.

**Classification:**

- ordinary generation quota failure — **no** (plain generation returns 200);
- Google Search-specific quota/access failure — **yes** (only the grounded request
  is rejected, on the same model and key);
- transient rate limit — **not supported** (no `RetryInfo`/`retryDelay`; plain
  generation on the same key succeeds immediately);
- exact quota metric/id — **undetermined** from the response (only `google.rpc.Help`
  is returned), so the precise metered limit cannot be named.

**Exact remaining action (human):** confirm whether the Google project behind the
key has **Grounding with Google Search entitlement**. Grounding — not generation —
is the gated capability. If the project lacks the entitlement, enabling it may
require a paid plan/billing change, which is a human decision and was **not**
performed. No model cycling, no zero-quota retries, no billing change, and no
benchmark rerun were done. The toolchain remains **not fully verified**.

### Continuation 4 — Gemini grounding verified; Exa-vs-Gemini completed (2026-09-14, final)

Billing enabled by the human (Default Gemini Project: Paid 1, €25 prepaid,
auto-reload **off**); paid Gemini usage authorized for this scoped benchmark.
The agent changed **no** billing setting and did not treat €25 as a spend target.

- **One grounded call through the configured MCP first:** `@houtini/gemini-mcp`
  2.6.2 returned `isError=false` with 12 grounding source
  (`vertexaisearch.cloud.google.com/grounding-api-redirect`) URLs and a
  synthesised answer — **grounding VERIFIED**. Model = configured
  `gemini-3.1-flash-lite` (the tool does not echo the model; grounding provenance
  is the redirect citations, not model text).
- **Exa-vs-Gemini completed** on the six shared queries across UK/DE/FR (see
  benchmark §8). Gemini-only new names: **James E. Hatch and Son**, **Woodstock
  Timber**, **Slatted Screen Fencing** (UK); **Sivalbp**, **Henry Timber** (FR);
  plus non-seller *Le Commerce du Bois* (trade body). Germany gained no new
  Gemini-only company. Overlap with Exa/Firecrawl (Southgate, Vincent, Premier,
  Timber2uDirect, NORclad, Benchmark, Duffield, Gadero, Housewood, Klöpfer,
  Holzhandelonline) is **not** independent corroboration.
- **Follow-ups verified on own sites:** James E. Hatch and Son (UK, exact; Class 1,
  390 kg/m³, FSC), Woodstock Timber (UK, exact), **Sivalbp** (FR — verified
  thermo-treatment specialist but **substitute**, no Ayous range).
- **Cost/usage:** Firecrawl ≈ 11 credits this pass; Gemini per-call cost **unknown**
  (MCP returns no token/cost data; billing dashboard is the source of truth);
  Exa unknown. No plan purchased; auto-reload left off.

Status after Continuation 4: Exa, Firecrawl and the Gemini MCP server were
independently verified (direct MCP-server call, not a native in-session tool).
**One integration gap remained: the Gemini tools were not surfaced to the
OpenCode agent session.** O-007 stayed open. No product onboarding, no database
change, no commit or push; the pre-existing staged/unstaged `README.md` state was
left untouched.

### Continuation 5 — integration gap diagnosed and fixed; native in-session call pending

**Diagnosis (evidence):**

- Effective config (`GET /config`) showed the running app still held
  `GEMINI_DEFAULT_MODEL: "gemini-2.5-flash"` (retired) — the app loaded config
  before the model correction (OpenCode does not hot-reload config).
- Log `12:47:36 level=WARN message="MCP connection closed" server=gemini`: the
  Gemini MCP child process was closed in the running app. Cause: an earlier
  broad `Stop-Process` cleanup matched `houtini|gemini-mcp` and killed
  OpenCode's own MCP child. OpenCode does **not** auto-respawn a closed MCP
  server.
- `GET /mcp` reported `gemini: connected` (after a manual re-add), so the
  server itself is healthy; the failure was lifecycle, not protocol.
- A dynamic `POST /mcp` re-add **with** `GEMINI_API_KEY: "{env:GEMINI_API_KEY}"`
  failed: log `13:21:16 level=WARN "server unavailable" key=gemini status=failed`
  → the `{env:...}` placeholder is **not** interpolated on the dynamic-add path,
  so the server received a literal invalid key.
- The same re-add **without** the key entry (server inherits the OpenCode process
  environment) returned `gemini: connected`.
- `GET /agent` and `/config` show **no** tool or agent restrictions (all agents
  unrestricted); `/experimental/tool` excludes MCP tools (Firecrawl absent too),
  so it is not a registry check.

**Fix applied (global `~/.config/opencode/opencode.jsonc`):**

- Removed `GEMINI_API_KEY` from the `gemini.environment` block; the local server
  now **inherits** the key from the OpenCode process environment (proven to
  connect). Model stays `gemini-3.1-flash-lite`; `GEMINI_DEFAULT_GROUNDING=true`;
  `timeout: 30000`. Config re-parsed and validated.
- No provider, permission, or other MCP setting was changed.

**Exact restart step (required for native availability):**

1. Fully quit the OpenCode desktop app — close all windows and confirm no
   `OpenCode.exe` remains in Task Manager.
2. Relaunch OpenCode from a normal Explorer/Start shortcut (so it inherits the
   User-scope `GEMINI_API_KEY`).
3. Open a fresh agent session in this repository; the Gemini MCP tools should
   appear alongside Firecrawl.
4. Do not kill processes whose command line contains `houtini`/`gemini-mcp`.

**Native in-session invocation: NOT yet verified.** The server is connected in the
running app, but this session's tool registry predates the reconnect, so the
agent could not call a `gemini_*` tool natively. **O-007 remains open** until a
grounded search is performed through a Gemini MCP tool directly available to the
agent. The direct MCP-server test and the six-query benchmark are accepted as
research evidence and were **not** rerun.

**Provenance correction (standing wording):**

- configured/requested model: **gemini-3.1-flash-lite**;
- response-reported model: **unknown** — the `@houtini/gemini-mcp` tool does not
  return the model it used;
- grounding provenance: the returned
  `vertexaisearch.cloud.google.com/grounding-api-redirect` citation URLs, kept as
  evidence, with substantive companies independently verified on their own sites.

### Continuation 6 — native invocation attempted: blocked (tool not in agent toolset)

**Attempt:** the agent looked for a Gemini MCP search tool in its own available
toolset in order to call it directly (not via a shell/diagnostic client).

**Result: BLOCKED — the tool is not present.** The agent's toolset contains
`firecrawl_firecrawl_search` / `_scrape` / `_parse` and the built-ins, but **no
`gemini_*` tool**.

**Specific blocker (observed on OpenCode 1.18.30 desktop, Windows 11):**

- The OpenCode server process is **the same instance as the previous turn**
  (PID 18672, listening `127.0.0.1:58102`), with `StartTime` ≈ 12:46 UTC — i.e.
  **before** the key was revoked/replaced and **before** a clean Gemini MCP
  startup. The app was therefore **not restarted**, so the tool registry built at
  app start still does not include the Gemini tools.
- `GET /mcp` reports `gemini: connected`, but that connection was created earlier
  by a dynamic `POST /mcp` using the **now-revoked** key; the running app process
  predates the replacement, so it cannot be using the replacement key.
- The replacement key is present at **User scope** and is inherited by the agent's
  shell child (length 39), but that does not retro-fit the already-running app.

**Actions:** per instruction, **no configuration change was made** after the
blocker was found. The operating rules were recorded (see below). No benchmark
rerun; no commit/push; no product onboarding or database changes.

**Rules recorded:**

- `AGENTS.md` §9 "Diagnostic and Process-Safety Rules (Harness)":
  1. never print full resolved configuration/environment objects — allowlist
     non-secret fields only;
  2. clean up only processes tracked by exact PID — never broad name/command-line
     kill filters;
  3. distinguish observed behavior in this OpenCode version from general claims.
- `docs/system/research-toolchain.md` §4 "Operational cautions" updated to match.

**Status:** native in-session invocation **still NOT verified**; O-007 remains
open. Required human action: perform the full app restart described in
Continuation 5 §"Exact restart step" (quit all windows, relaunch from
Explorer/Start, open a new session) so the app inherits the replacement key and
re-registers the Gemini tools; then a grounded search can be called natively.

### Continuation 7 — Gemini native invocation VERIFIED; DeepSeek server-side search NOT EXECUTED (2026-09-14, final)

**1. Gemini native in-session invocation — SUCCESS.**

- The `gemini_*` tools are now present in the **agent's own toolset** (direct
  native tools), so the restarted session resolved the integration gap in
  Continuation 5/6.
- One tool was invoked natively with Google Search grounding enabled:
  `gemini_gemini_chat` on the shared UK-1 query (`thermo ayous cladding supplier
  UK`). It returned a synthesised answer plus **15
  `vertexaisearch.cloud.google.com/grounding-api-redirect` citation URLs** (some
  duplicated) — Google Search grounding **verified natively**.
- Provenance: configured/requested model = **`gemini-3.1-flash-lite`** (MCP
  default; no model passed explicitly). **Response-reported model = not returned**
  (the tool does not echo it). Token usage/cost not returned.
- The answer named one new company, **The Timber Group** — discovery only,
  `NOT_EVALUATED` (not fetched).

**2. DeepSeek server-side web search — NOT EXECUTED (documented negative).**

- **OpenCode transport:** the built-in `deepseek` provider is defined as npm
  `@ai-sdk/openai-compatible`, base URL `https://api.deepseek.com` → OpenAI-
  compatible **Chat Completions**, **not** Responses. No provider override in the
  global config. Auth reused from `~/.local/share/opencode/auth.json`
  (`deepseek`, `type: api`) at runtime; never printed, never a CLI argument, never
  written to a tracked file.
- **Direct API test** (`POST https://api.deepseek.com/responses`, model
  `deepseek-flash`, `tools:[{"type":"web_search"}]`,
  `tool_choice:{"type":"web_search"}`): **HTTP 200**, `status=completed`;
  `output` items = `reasoning`, `message` only — **no `web_search_call` item**.
  One bounded confirmation with `tool_choice:"auto"` behaved identically
  (no search item, 0 annotations). Usage returned: DS-1 `input 38 / output 3721
  (reasoning 3176) / total 3759`; DS-2 `input 38 / output 4571 (reasoning 4105) /
  total 4609`. The model's plausible supplier list is **model prior knowledge,
  not search output**, and is not counted as evidence.
- **Cause:** DeepSeek documents built-in tools (`web_search`, etc.) as
  **"Ignored"** on the Responses API; Chat Completions supports only `function`.
  So DeepSeek exposes **no** server-side web search, and there is nothing for
  OpenCode's native integration to surface. Smallest integration option — none
  server-side today; recorded in `research-toolchain.md` §2.6, **not implemented**.
- **Direct API success vs native OpenCode integration are distinguished:** the
  direct API is a documented negative (server ignores the tool); the OpenCode
  native path was not changed and no provider was added.

**3. Conditional extension not run.** The six UK/DE/FR benchmark queries were
**not** sent to DeepSeek because DeepSeek search did not succeed. Existing
Exa/Firecrawl/Gemini results were preserved and **not rerun**.

**4. Operating context preserved.** No resolved config/env or credential was
printed; the pre-existing staged/unstaged `README.md` state was left untouched; no
billing setting, provider or permission was changed; no `soft/**` change, no
database change, and no commit or push were made. Evidence is in
`docs/benchmarks/2026-09-14-research-coverage-capability-test.md` §9 and
`docs/system/research-toolchain.md` §2.4/§2.6/§5/§7.

**Status at Continuation 7:** O-007 **READY_FOR_HUMAN_REVIEW**. Gemini grounding
is verified both at the server level (Continuation 4) and natively in-session
(Continuation 7). Remaining gaps (all non-blocking, recorded): The Timber Group
`NOT_EVALUATED`; DE price unit for holzhandelonline; many first-pass candidates
`NOT_EVALUATED`; Gemini per-call cost and Exa usage not observable; DeepSeek
server-side web search was not observed in the tested configuration.

### Closure — documentation correction and approval (2026-09-14)

Human approved O-007 for closure after this documentation correction:

- Replaced categorical claims that DeepSeek has no server-side search with:
  "Server-side web search was not observed in the tested account/model/endpoint
  configuration on 2026-09-14. Both requests completed without `web_search_call`
  items or source annotations. This path is not accepted as a verified research
  tool." (`research-toolchain.md` §2.6/§5/§7; benchmark §9.2/§9.3;
  `decisions.md`).
- Recorded the exact documentation URL and relevant supported/ignored wording
  (`https://api-docs.deepseek.com/guides/responses_api/` Tools table: `web_search`
  / `file_search` / `code_interpreter` / `computer_use` / `mcp` / other built-in
  tools — **Ignored**; `function` — **Supported**), and the conflict with the
  guide's "Input Items" note (which refers to `web_search_call` items being
  restored and concatenated) without inventing an explanation. **No additional
  API tests** were run.
- Marked the verified operating toolchain: **Exa** — discovery; **Gemini Google
  Search** — native in-session grounded discovery; **webfetch / Firecrawl** —
  source retrieval and verification (`research-toolchain.md` §5, `decisions.md`,
  `project-state.md`).
- Kept research-coverage gaps visible: toolchain readiness does **not** mean the
  European market research is complete (`project-state.md` Immediate priority).

No commit, push, new task, product onboarding, or database change. Pre-existing
staged/unstaged `README.md` changes preserved.
